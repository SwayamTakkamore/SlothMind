#!/usr/bin/env python3
import json
import os
import sys
import threading
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from huggingface_hub import scan_cache_dir, snapshot_download, try_to_load_from_cache
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

# Global model and state
# IMPORTANT: No model is loaded by default. User explicitly chooses and switches models.
current_model_name: Optional[str] = None
model = None
tokenizer = None
device = "cpu"
device_info = {}

# Background download tracking
active_downloads: Dict[str, dict] = {}

AVAILABLE_MODELS = [
    {
        "id": "google/gemma-3-1b-it",
        "name": "Gemma 3 1B Instruct",
        "family": "Gemma 3",
        "parameters": "1.0B",
        "size_gb": 1.86,
        "recommended": True,
        "description": "Google's ultra-efficient 1B model. 100% fits in 4GB VRAM with ~2.1 GB headroom. High-speed streaming.",
        "context_window": 8192,
        "tags": ["Fastest", "Fits in VRAM", "Gemma 3"],
    },
    {
        "id": "google/gemma-3-270m-it",
        "name": "Gemma 3 270M Instruct",
        "family": "Gemma 3",
        "parameters": "270M",
        "size_gb": 0.50,
        "recommended": False,
        "description": "Google's ultra-compact 270M model. Featherlight 500MB download, near-zero VRAM usage.",
        "context_window": 8192,
        "tags": ["Featherlight", "Instant", "Gemma 3"],
    },
    {
        "id": "google/gemma-3-4b-it",
        "name": "Gemma 3 4B Instruct",
        "family": "Gemma 3",
        "parameters": "4.0B",
        "size_gb": 8.01,
        "recommended": False,
        "description": "Deep reasoning & multi-step synthesis. Offloads layers between 4GB VRAM and system RAM.",
        "context_window": 8192,
        "tags": ["Deep Reasoning", "GPU+RAM Split", "Gemma 3"],
    },
    {
        "id": "google/gemma-4-E2B-it",
        "name": "Gemma 4 E2B Instruct",
        "family": "Gemma 4",
        "parameters": "2.0B Eff",
        "size_gb": 9.54,
        "recommended": False,
        "description": "Google's next-gen Gemma 4 Efficient 2B model architecture. High parameter efficiency.",
        "context_window": 8192,
        "tags": ["Next-Gen", "Gemma 4"],
    },
    {
        "id": "google/gemma-4-E4B-it",
        "name": "Gemma 4 E4B Instruct",
        "family": "Gemma 4",
        "parameters": "4.0B Eff",
        "size_gb": 14.89,
        "recommended": False,
        "description": "Gemma 4 Efficient 4B instruction-tuned model for advanced knowledge work.",
        "context_window": 8192,
        "tags": ["Next-Gen", "Large", "Gemma 4"],
    },
    {
        "id": "google/gemma-2-2b-it",
        "name": "Gemma 2 2B Instruct",
        "family": "Gemma 2",
        "parameters": "2.6B",
        "size_gb": 5.20,
        "recommended": False,
        "description": "Google's battle-tested Gemma 2 2.6B model. Great general reasoning and Markdown generation.",
        "context_window": 8192,
        "tags": ["Proven", "Gemma 2"],
    },
    {
        "id": "HuggingFaceTB/SmolLM-135M-Instruct",
        "name": "SmolLM 135M Instruct",
        "family": "SmolLM",
        "parameters": "135M",
        "size_gb": 0.27,
        "recommended": False,
        "description": "Pre-cached micro model. Extreme speed, fits entirely in L2/VRAM cache.",
        "context_window": 2048,
        "tags": ["Pre-cached", "Micro"],
    },
]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 256
    stream: Optional[bool] = True

class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150

class RewriteRequest(BaseModel):
    text: str
    instruction: str

class ActivateModelRequest(BaseModel):
    model_id: str

class DownloadModelRequest(BaseModel):
    model_id: str

def init_hardware():
    global device, device_info
    if torch.cuda.is_available():
        device = "cuda"
        device_info = {
            "device": "cuda:0",
            "gpu": torch.cuda.get_device_name(0),
            "gpu_count": torch.cuda.device_count(),
            "total_vram_mb": round(torch.cuda.get_device_properties(0).total_memory / (1024**2)),
        }
    else:
        device = "cpu"
        device_info = {"device": "cpu", "gpu": None, "total_vram_mb": 0}
    print(f"Hardware initialized: {device_info}", file=sys.stderr)

def is_model_downloaded(repo_id: str) -> tuple[bool, int]:
    """Returns (is_downloaded, size_in_bytes)"""
    try:
        has_weights = (
            try_to_load_from_cache(repo_id, "model.safetensors") is not None
            or try_to_load_from_cache(repo_id, "model.safetensors.index.json") is not None
            or try_to_load_from_cache(repo_id, "pytorch_model.bin") is not None
        )
        cache = scan_cache_dir()
        disk_size = 0
        for r in cache.repos:
            if r.repo_id == repo_id:
                disk_size = r.size_on_disk
                # Consider downloaded if weights are confirmed or repo size > 150MB
                if disk_size > 150 * 1024 * 1024:
                    has_weights = True
                break
        return has_weights, disk_size
    except Exception:
        return False, 0

def unload_current_model():
    global model, tokenizer, current_model_name
    if model is not None:
        print(f"Unloading model {current_model_name}...", file=sys.stderr)
        del model
        model = None
    if tokenizer is not None:
        del tokenizer
        tokenizer = None
    current_model_name = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    print("Model unloaded, VRAM cleared.", file=sys.stderr)

def load_selected_model(model_id: str):
    global model, tokenizer, current_model_name, device
    print(f"Loading {model_id} onto {device}...", file=sys.stderr)
    
    # First unload existing model to free VRAM
    unload_current_model()
    
    tokenizer = AutoTokenizer.from_pretrained(model_id, local_files_only=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        
    if device == "cuda":
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            dtype=torch.float16,
            device_map="auto",
            local_files_only=False,
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            dtype=torch.float32,
            local_files_only=False,
        )
        model = model.to(device)
        
    current_model_name = model_id
    print(f"Successfully loaded and activated {model_id}", file=sys.stderr)

def background_download_task(model_id: str, total_gb: float):
    global active_downloads
    target_bytes = int(total_gb * 1024 * 1024 * 1024)
    active_downloads[model_id] = {
        "status": "downloading",
        "progress": 5,
        "downloaded_bytes": 0,
        "total_bytes": target_bytes,
        "message": "Connecting to Hugging Face...",
    }
    
    def monitor_progress():
        while active_downloads.get(model_id, {}).get("status") == "downloading":
            _, current_bytes = is_model_downloaded(model_id)
            if current_bytes > 0:
                pct = min(95, max(5, int((current_bytes / target_bytes) * 100)))
                active_downloads[model_id]["progress"] = pct
                active_downloads[model_id]["downloaded_bytes"] = current_bytes
                active_downloads[model_id]["message"] = f"Downloaded {(current_bytes / (1024**3)):.2f} GB of {total_gb:.2f} GB ({pct}%)"
            time.sleep(1.0)
            
    monitor_thread = threading.Thread(target=monitor_progress, daemon=True)
    monitor_thread.start()
    
    try:
        snapshot_download(repo_id=model_id)
        _, final_bytes = is_model_downloaded(model_id)
        active_downloads[model_id] = {
            "status": "completed",
            "progress": 100,
            "downloaded_bytes": final_bytes,
            "total_bytes": target_bytes,
            "message": "Download complete. Ready to activate!",
        }
    except Exception as e:
        active_downloads[model_id] = {
            "status": "error",
            "progress": 0,
            "error": str(e),
            "message": f"Download failed: {e}",
        }

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_hardware()
    # NO MODEL IS LOADED BY DEFAULT.
    yield
    unload_current_model()

app = FastAPI(title="SlothMind HuggingFace Local Service", version="2.0.0", lifespan=lifespan)

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
        "active_model": current_model_name,
        "loaded": model is not None,
        "models_available": len(AVAILABLE_MODELS),
    }

@app.get("/models")
async def get_models():
    results = []
    for m in AVAILABLE_MODELS:
        m_id = m["id"]
        downloaded, size_on_disk = is_model_downloaded(m_id)
        dl_info = active_downloads.get(m_id)
        
        is_dl = dl_info is not None and dl_info.get("status") == "downloading"
        dl_pct = dl_info.get("progress", 0) if dl_info else 0
        
        results.append({
            **m,
            "is_downloaded": downloaded,
            "is_downloading": is_dl,
            "download_progress": dl_pct,
            "download_status": dl_info.get("status") if dl_info else ("downloaded" if downloaded else "available"),
            "download_message": dl_info.get("message") if dl_info else None,
            "is_active": m_id == current_model_name,
            "disk_size_bytes": size_on_disk,
        })
        
    return {
        "active_model": current_model_name,
        "device": device_info,
        "models": results,
    }

@app.post("/models/activate")
async def activate_model(request: ActivateModelRequest):
    m_id = request.model_id
    valid = any(m["id"] == m_id for m in AVAILABLE_MODELS)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Unknown model: {m_id}")
    
    try:
        load_selected_model(m_id)
        return {
            "status": "ok",
            "active_model": current_model_name,
            "message": f"Successfully activated {m_id}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load {m_id}: {str(e)}")

@app.post("/models/unload")
async def unload_model_endpoint():
    unload_current_model()
    return {"status": "ok", "active_model": None, "message": "Model unloaded from memory"}

@app.post("/models/download")
async def download_model_endpoint(request: DownloadModelRequest):
    m_id = request.model_id
    model_meta = next((m for m in AVAILABLE_MODELS if m["id"] == m_id), None)
    if not model_meta:
        raise HTTPException(status_code=400, detail=f"Unknown model: {m_id}")
        
    if active_downloads.get(m_id, {}).get("status") == "downloading":
        return {"status": "in_progress", "model_id": m_id, "message": "Download is already in progress"}
        
    thread = threading.Thread(
        target=background_download_task,
        args=(m_id, model_meta["size_gb"]),
        daemon=True,
    )
    thread.start()
    return {"status": "started", "model_id": m_id, "message": f"Download initiated for {m_id}"}

@app.get("/models/download-status")
async def download_status_endpoint():
    return {"downloads": active_downloads}

def format_chat_prompt(messages: List[ChatMessage]) -> str:
    if tokenizer is not None and hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template:
        try:
            msg_dicts = [{"role": m.role, "content": m.content} for m in messages]
            return tokenizer.apply_chat_template(msg_dicts, tokenize=False, add_generation_prompt=True)
        except Exception:
            pass
    # Simple fallback chat formatting
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
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=400,
            detail="No AI model is currently active. Please open the Model Library to activate or download a model.",
        )
    try:
        prompt = format_chat_prompt(request.messages)
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=min(request.max_tokens or 256, 512),
            temperature=request.temperature or 0.3,
            repetition_penalty=1.15,
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
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=400,
            detail="No AI model is currently active. Please open the Model Library to activate or download a model.",
        )
    try:
        prompt = f"User: Summarize the following text concisely:\n\n{request.text}\n\nAssistant: "
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=min(request.max_length or 150, 300),
                temperature=0.3,
                repetition_penalty=1.15,
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
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=400,
            detail="No AI model is currently active. Please open the Model Library to activate or download a model.",
        )
    try:
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
                temperature=0.4,
                repetition_penalty=1.15,
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
