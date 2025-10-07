# 🎬 Video Converter

## Introdução
🎬 **Video Converter – Conversor de Vídeos com IA**  
Aplicativo desktop que realiza upscale de vídeos usando IA (Real-ESRGAN), preserva o áudio original e permite escolher qual memória da GPU será usada e a escala do upscale. Suporta Português (BR), Espanhol e Inglês, logs de processamento e escolha de pasta de saída.

**Tecnologias:** React + Electron + TypeScript + Tailwind (Frontend), Python (Backend)

---

## Descrição Longa

O **Video Converter** é um aplicativo completo para conversão e upscale de vídeos usando inteligência artificial. Ele conta com interface amigável, logs detalhados de processamento e suporte a múltiplos idiomas.

### Frontend

| Campo | Descrição |
|-------|-----------|
| Framework | React 18 |
| Tipagem | TypeScript |
| UI | TailwindCSS |
| Bundler | Vite |
| Desktop | Electron |
| Dependências principais | react, react-dom, electron, electron-builder, vite, tailwindcss, typescript, postcss |
| Scripts úteis | dev, build, preview, electron, electron-dev, dist, dist:dir, pack |
| Observação | `electron-builder` usado para gerar instaladores para Windows (NSIS) |

---

### Backend

| Biblioteca | Versão | Função |
|------------|--------|-------|
| opencv-python | 4.8.1.78 | Processamento de vídeo e imagem |
| Pillow | 10.0.0 | Manipulação de imagens |
| numpy | 1.24.3 | Computação numérica |
| moviepy | 1.0.3 | Edição de vídeo e áudio |
| imageio | 2.31.1 | Suporte a formatos de imagem (para moviepy) |
| imageio-ffmpeg | 0.4.8 | FFmpeg para moviepy |
| ffmpeg-python | 0.2.0 | Interface Python para FFmpeg (opcional) |
| scipy | 1.10.1 | Processamento científico |
| scikit-image | 0.21.0 | Processamento de imagem avançado |
| tqdm | 4.66.1 | Barras de progresso (opcional) |
| psutil | 5.9.6 | Monitoramento de sistema (opcional) |
| colorama | 0.4.6 | Cores no terminal (desenvolvimento) |

---

### 🔗 Repositório Real-ESRGAN

O **Video Converter** utiliza o **Real-ESRGAN** como motor de upscale de vídeos.  
Caso você queira usar ou estudar diretamente, o repositório oficial está disponível em:  

[Real-ESRGAN GitHub](https://github.com/xinntao/Real-ESRGAN)

> 💡 Observação: É necessário seguir as instruções do Real-ESRGAN para instalação e dependências se quiser rodar o upscale fora do Video Converter.  

---


## Observações Importantes

1. É **necessário ter um computador com boa capacidade de GPU e CPU** para rodar o aplicativo de forma eficiente.
2. A configuração de `backend/scripts/upscale.py` foi feita com base no computador do desenvolvedor.  
O arquivo define a função `choose_optimal_settings`.

💡 **Observação prática:**  
- Meu setup: **Intel i5-11400F** + **NVIDIA RTX 4060**.  
- Na prática, só consegui usar **até 2 threads por execução** sem travamentos significativos.  
- Durante o processamento, a CPU ficava entre **70% e 95%** de uso.  
- Eu deixei no código como **1 thread**, o mais básico possível.  
- Ultrapassar esses limites tende a causar sobrecarga e não é recomendado.


```python
def choose_optimal_settings(gpu_memory_mb):
    """CONFIGURAÇÃO OTIMIZADA PARA 8GB GPU + 6 CORE CPU"""
    if gpu_memory_mb >= 7000:
        settings = {
            "j_value": "1:1:1",
            "batch_size": 1,
            "tile_size": 0,
            "num_threads": 1,
            "gpu_id": "0",
            "prefetch": 0
        }
        log_message("🚀 CONFIGURAÇÃO: MÁXIMA PERFORMANCE GPU (8GB) - BATCH=2")
    elif gpu_memory_mb >= 4000:
        settings = {
            "j_value": "1:1:1",
            "batch_size": 1,
            "tile_size": 400,
            "num_threads": 1,
            "gpu_id": "0",
            "prefetch": 0
        }
        log_message("⚡ Configuração: Balanceada")
    else:
        settings = {
            "j_value": "1:1:1", 
            "batch_size": 1,
            "tile_size": 256,
            "num_threads": 1,
            "gpu_id": "0",
            "prefetch": 0
        }
        log_message("🔧 Configuração: Conservadora")
    return settings
```
## ⚠️ Dicas de Performance

Para garantir o melhor desempenho durante o upscale, siga estas recomendações:

### 💡 Configurações básicas
- **Não utilize 100% da CPU** durante o processamento; comece com configurações conservadoras.  
- Ajuste **gradualmente** os parâmetros para evitar superaquecimento e preservar a vida útil do hardware.

### 🚀 Como acelerar o processo
- **`batch_size`**: define quantos frames a GPU processa simultaneamente.  
  - Ex.: `1` → processa 1 frame por vez (básico)  
  - `2` → processa 2 frames por vez (mais rápido)  
- **`num_threads`**: define quantos threads da CPU podem rodar ao mesmo tempo.  
  - Quanto maior o número de threads, mais rápido será o processamento (dependendo do seu CPU).

### ⚖️ Ajustes recomendados
- GPUs com **8GB ou mais**: maximize `batch_size` e use tiles grandes para performance máxima.  
- GPUs com **4GB a 7GB**: use configuração balanceada (tiles médios, batch moderado).  
- GPUs menores que **4GB**: use configuração conservadora para evitar travamentos.

---

## 📄 Licença

MIT License – Gabriel Teperino Percegoni Figueira
