#!/usr/bin/env python3
import json
import os
import sys
import threading
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

MODEL_NAME = "HuggingFaceTB/SmolLM-135M-Instruct"

# Global model and tokenizer
model = None
tokenizer = None
device = "cpu"
device_info = {}

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 256
    stream: Optional[bool] = True

class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150

class RewriteRequest(BaseModel):
    text: str
    instruction: str  # e.g., "summarize", "simplify", "fix-grammar", "explain"

def load_model():
    global model, tokenizer, device, device_info
    try:
        # Auto-detect CUDA
        if torch.cuda.is_available():
            device = "cuda"
            device_info = {
                "device": "cuda:0",
                "gpu": torch.cuda.get_device_name(0),
                "gpu_count": torch.cuda.device_count(),
            }
        else:
            device = "cpu"
            device_info = {"device": "cpu", "gpu": None}
        
        print(f"Loading model {MODEL_NAME} on {device}...", file=sys.stderr)
        # Load from local cache
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=False)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        if device == "cuda":
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                dtype=torch.float16,
                device_map="auto",
                local_files_only=False,
            )
        else:
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                dtype=torch.float32,
                local_files_only=False,
            )
            model = model.to(device)
        
        print(f"Model loaded successfully on {device}", file=sys.stderr)
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield

app = FastAPI(title="SlothMind HuggingFace Local Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:43117"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    gpu_name = device_info.get("gpu", "N/A") if device == "cuda" else "N/A"
    return {
        "status": "ok",
        "provider": "huggingface-local",
        "device": device_info.get("device", device),
        "gpu": gpu_name,
        "model": MODEL_NAME,
    }

@app.get("/models")
async def get_models():
    return {
        "models": [
            {
                "name": MODEL_NAME,
                "provider": "huggingface-local",
                "device": device_info.get("device", device),
            }
        ]
    }

def format_chat_prompt(messages: List[ChatMessage]) -> str:
    # Simple chat formatting for SmolLM
    prompt = ""
    for msg in messages:
        if msg.role == "system":
            prompt += f"System: {msg.content}\n\n"
        elif msg.role == "user":
            prompt += f"User: {msg.content}\n\n"
        elif msg.role == "assistant":
            prompt += f"Assistant: {msg.content}\n\n"
    prompt += "Assistant: "
    return prompt

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        prompt = format_chat_prompt(request.messages)
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=min(request.max_tokens or 256, 512),
            temperature=request.temperature or 0.7,
            do_sample=True,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
        
        thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()
        
        async def generate():
            try:
                for text in streamer:
                    if text:
                        data = json.dumps({"content": text})
                        yield f"data: {data}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_data = json.dumps({"error": str(e)})
                yield f"data: {error_data}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize(request: SummarizeRequest):
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        prompt = f"User: Summarize the following text concisely:\n\n{request.text}\n\nAssistant: "
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=min(request.max_length or 150, 300),
                temperature=0.3,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        return {"summary": response.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rewrite")
async def rewrite(request: RewriteRequest):
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        instruction_map = {
            "summarize": "Summarize this text",
            "simplify": "Simplify this text to make it easier to understand",
            "fix-grammar": "Fix grammar and spelling in this text",
            "explain": "Explain this text in simpler terms",
        }
        instruction = instruction_map.get(request.instruction, request.instruction)
        
        prompt = f"User: {instruction}:\n\n{request.text}\n\nAssistant: "
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.5,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        return {"rewritten": response.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=43118, log_level="info")
