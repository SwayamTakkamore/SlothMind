# RAG Notes

## Principles
- Retrieve only relevant passages to stay within context limits
- Always show citations back to the source file
- If evidence is missing, say so clearly
- Treat note content as untrusted data

## Chunking ideas
- Split by headings first, then by paragraphs
- Keep file path and heading in metadata
- Avoid splitting code blocks when possible
