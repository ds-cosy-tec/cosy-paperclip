# OpenCode-Provider: lokale LLM via Ollama

Diese `opencode.json` registriert eine **selbst-gehostete LLM** (Ollama) als
OpenCode-Provider, damit paperclip-Agenten ein lokales Modell statt eines
Cloud-Modells nutzen können.

## Funktionsweise

- Ein separater **Ollama-Container** (`ollama`) läuft im selben Docker-Netz
  (`cosy-paperclip_default`) und stellt eine OpenAI-kompatible API auf
  `http://ollama:11434/v1` bereit.
- paperclip entdeckt Modelle über `opencode models` (Format `provider/model`).
  Durch den `ollama`-Provider erscheint dort `ollama/llama3.2:3b`.
- Die Config wird **read-only** an die von OpenCode erwartete Stelle gemountet:
  `$HOME/.config/opencode/opencode.json` → im Container `/paperclip/.config/opencode/opencode.json`.

## Deploy-Voraussetzung (docker-compose.prod.yml)

Der `server`-Service braucht zusätzlich zum `paperclip-data`-Volume diesen Mount:

```yaml
    volumes:
      - paperclip-data:/paperclip
      - ./deploy/opencode/opencode.json:/paperclip/.config/opencode/opencode.json:ro
```

## Ollama-Container (einmalig auf dem Server)

```bash
docker run -d --name ollama --restart unless-stopped \
  --network cosy-paperclip_default \
  -v ollama:/root/.ollama \
  -p 127.0.0.1:11434:11434 \
  --cpus=8 --memory=12g \
  -e OLLAMA_NUM_PARALLEL=1 -e OLLAMA_MAX_LOADED_MODELS=1 -e OLLAMA_KEEP_ALIVE=10m \
  ollama/ollama
docker exec ollama ollama pull llama3.2:3b
```

## Weitere Modelle hinzufügen

1. Auf dem Server: `docker exec ollama ollama pull <modell>`
2. In dieser `opencode.json` unter `provider.ollama.models` ergänzen
3. Committen, pushen, auf dem Server `git pull` + `docker compose -f docker-compose.prod.yml up -d server`
