import os
import cv2
import subprocess
import shutil
import sys
import signal
import io
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# ----------------------------
# Forçar flush automático em todos os prints
# ----------------------------
print = lambda *args, **kwargs: __builtins__.print(*args, **kwargs, flush=True)

# Forçar stdout e stderr em UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ----------------------------
# Diretório base
# ----------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def log_message(message, type="log"):
    """Envia uma mensagem para o stdout em formato JSON."""
    log_entry = {"type": type, "message": message, "timestamp": time.time()}
    print(json.dumps(log_entry))

def progress_update(progress, message=None, stage=None):
    """Envia uma atualização de progresso para o stdout em formato JSON."""
    progress_entry = {"type": "progress", "progress": progress, "message": message, "stage": stage, "timestamp": time.time()}
    print(json.dumps(progress_entry))

def setup_directories():
    """Cria os diretórios necessários"""
    uploads_dir = os.path.join(BASE_DIR, "uploads")
    outputs_dir = os.path.join(BASE_DIR, "outputs")
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(outputs_dir, exist_ok=True)
    
def clean_temp_folder(tmp_folder):
    """Limpa a pasta temporária se existir"""
    tmp_path = os.path.join(BASE_DIR, tmp_folder)
    if os.path.exists(tmp_path):
        shutil.rmtree(tmp_path)
    os.makedirs(tmp_path, exist_ok=True)

def get_video_info(input_path):
    """Obtém informações do vídeo"""
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError("Não foi possível abrir o vídeo")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    
    return fps, frame_count, width, height

def extract_audio(input_video, output_audio):
    """Extrai áudio do vídeo usando FFmpeg"""
    try:
        cmd = [
            "ffmpeg",
            "-i", input_video,
            "-vn", "-acodec", "copy",
            output_audio,
            "-y"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            log_message("✅ Áudio extraído com sucesso")
            return True
        else:
            log_message(f"⚠️ Aviso: Não foi possível extrair áudio: {result.stderr}", "warning")
            return False
    except Exception as e:
        log_message(f"⚠️ Aviso: Erro ao extrair áudio: {e}", "warning")
        return False

def add_audio_to_video(video_path, audio_path, output_path):
    """Adiciona áudio ao vídeo usando FFmpeg"""
    try:
        # Verificar se os arquivos existem
        if not os.path.exists(video_path):
            log_message(f"❌ Vídeo não encontrado: {video_path}", "error")
            return False
        if not os.path.exists(audio_path):
            log_message(f"❌ Áudio não encontrado: {audio_path}", "error")
            return False
            
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            output_path,
            "-y"
        ]
        
        log_message(f"🔊 Comando FFmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            log_message("✅ Áudio adicionado com sucesso!")
            return True
        else:
            log_message(f"❌ Erro ao adicionar áudio: {result.stderr}", "error")
            return False
    except Exception as e:
        log_message(f"❌ Erro ao adicionar áudio: {e}", "error")
        return False

def extract_frames(input_path, tmp_folder):
    """Extrai frames do vídeo"""
    cap = cv2.VideoCapture(input_path)
    frame_idx = 0
    
    log_message("Extraindo frames do vídeo...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        tmp_input = os.path.join(BASE_DIR, tmp_folder, f"frame_{frame_idx:06d}.png")
        success = cv2.imwrite(tmp_input, frame)
        if not success:
            log_message(f"⚠️ Erro ao salvar frame {frame_idx}", "warning")
        frame_idx += 1
        
        if frame_idx % 30 == 0:
            log_message(f"Extraídos {frame_idx} frames...")
            progress = 10 + (frame_idx / 1000) * 20
            progress_update(progress, f"Extraídos {frame_idx} frames", "extracting")
    
    cap.release()
    log_message(f"Total de {frame_idx} frames extraídos.")
    return frame_idx

def get_gpu_memory():
    """Obtém a memória total da GPU em MB"""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            total_mem = int(result.stdout.strip().split("\n")[0])
            log_message(f"🎮 Memória GPU detectada: {total_mem} MB")
            return total_mem
    except Exception as e:
        log_message(f"⚠️ Não foi possível detectar memória GPU: {e}", "warning")
    
    return 8192  # Fallback para 8GB

def choose_optimal_settings(gpu_memory_mb):
    """Escolhe configurações ótimas baseadas na memória da GPU"""
    # 🔥 CONFIGURAÇÕES MAIS AGRESSIVAS PARA RTX 4060
    if gpu_memory_mb >= 8000:
        settings = {
            "j_value": "16:8:8",  # Mais threads
            "batch_size": 1,
            "tile_size": 400,     # Tile maior
            "num_threads": 2      # Processos paralelos
        }
        log_message("🚀 Configuração: GPU High-Performance (8GB+)")
    elif gpu_memory_mb >= 6000:
        settings = {
            "j_value": "12:6:6",
            "batch_size": 1,
            "tile_size": 300,
            "num_threads": 2
        }
        log_message("⚡ Configuração: GPU Mid-Range (6GB)")
    else:
        settings = {
            "j_value": "8:4:4",
            "batch_size": 1,
            "tile_size": 200,
            "num_threads": 1
        }
        log_message("🔧 Configuração: GPU Low-Memory")
    
    return settings

def process_single_frame(frame_file, tmp_dir, exe_path, scale, settings):
    """Processa um único frame"""
    tmp_input = os.path.join(tmp_dir, frame_file)
    frame_number = frame_file.replace("frame_", "").replace(".png", "")
    tmp_output = os.path.join(tmp_dir, f"frame_up_{frame_number}.png")
    
    if os.path.exists(tmp_output):
        return True, frame_file
    
    cmd = [
        exe_path,
        "-i", tmp_input,
        "-o", tmp_output,
        "-s", str(scale),
        "-f", "png",
        "-g", "0",  # Sempre usar GPU
        "-j", settings["j_value"]
    ]
    
    # Adicionar tile size se especificado
    if settings["tile_size"] > 0:
        cmd.extend(["-t", str(settings["tile_size"])])
    
    try:
        # Timeout aumentado para processamento pesado
        timeout = 120
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        
        if result.returncode == 0:
            return True, frame_file
        else:
            error_msg = result.stderr.strip()
            if "out of memory" in error_msg.lower():
                log_message(f"💥 Out of Memory no frame {frame_file}", "error")
            return False, frame_file
            
    except subprocess.TimeoutExpired:
        log_message(f"⏰ Timeout no frame {frame_file}", "warning")
        return False, frame_file
    except Exception as e:
        log_message(f"⚠️ Erro no frame {frame_file}: {e}", "warning")
        return False, frame_file

def upscale_frames_optimized(tmp_folder, exe_path, scale=2, gpu_memory_limit=None):
    """Versão otimizada do upscale de frames"""
    tmp_dir = os.path.join(BASE_DIR, tmp_folder)
    frame_files = [f for f in os.listdir(tmp_dir) if f.startswith("frame_") and f.endswith(".png") and not f.startswith("frame_up_")]
    
    if not frame_files:
        log_message("❌ Nenhum frame encontrado para upscale", "error")
        return 0
    
    log_message(f"🚀 Iniciando upscale otimizado para {len(frame_files)} frames...")
    
    # Detectar memória GPU
    if gpu_memory_limit:
        gpu_memory = gpu_memory_limit
        log_message(f"🎯 Memória GPU configurada manualmente: {gpu_memory} MB")
    else:
        gpu_memory = get_gpu_memory()
    
    # Obter configurações ótimas
    settings = choose_optimal_settings(gpu_memory)
    log_message(f"⚙️ Configurações otimizadas: j={settings['j_value']}, tile={settings['tile_size']}, threads={settings['num_threads']}")
    
    successful_frames = 0
    failed_frames = 0
    
    # Processar frames em paralelo
    max_workers = settings["num_threads"]
    
    log_message(f"🔁 Processando com {max_workers} threads paralelas...")
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submeter todos os frames para processamento
        future_to_frame = {
            executor.submit(process_single_frame, frame_file, tmp_dir, exe_path, scale, settings): frame_file
            for frame_file in frame_files
        }
        
        for i, future in enumerate(as_completed(future_to_frame)):
            frame_file = future_to_frame[future]
            try:
                success, processed_frame = future.result()
                if success:
                    successful_frames += 1
                else:
                    failed_frames += 1
                
                # Atualizar progresso a cada 5 frames
                if (i + 1) % 5 == 0:
                    progress = 30 + ((i + 1) / len(frame_files)) * 50
                    progress_update(progress, f"Processados {i + 1}/{len(frame_files)} frames", "upscaling")
                    log_message(f"✅ {i + 1}/{len(frame_files)} frames processados...")
                    
            except Exception as e:
                log_message(f"❌ Erro no frame {frame_file}: {e}", "error")
                failed_frames += 1
    
    log_message(f"📊 Resultado final: {successful_frames} frames bem-sucedidos, {failed_frames} falhas")
    
    return successful_frames

def calculate_target_resolution(original_width, original_height, target_height=1080):
    aspect_ratio = original_width / original_height
    target_width = int(target_height * aspect_ratio)
    target_width = target_width if target_width % 2 == 0 else target_width + 1
    target_height = target_height if target_height % 2 == 0 else target_height + 1
    return target_width, target_height

def create_output_video(tmp_folder, output_path, fps, target_width=None, target_height=None):
    """Cria o vídeo final a partir dos frames upscaled"""
    tmp_dir = os.path.join(BASE_DIR, tmp_folder)
    upscaled_frame_files = sorted([f for f in os.listdir(tmp_dir) if f.startswith("frame_up_") and f.endswith(".png")])
    
    if not upscaled_frame_files:
        raise ValueError("❌ Nenhum frame upscaled encontrado")
    
    log_message(f"📹 Encontrados {len(upscaled_frame_files)} frames upscaled")
    
    # Verificar se o primeiro frame existe
    first_frame_path = os.path.join(tmp_dir, upscaled_frame_files[0])
    if not os.path.exists(first_frame_path):
        raise ValueError(f"❌ Frame não encontrado: {first_frame_path}")
    
    sample_frame = cv2.imread(first_frame_path)
    if sample_frame is None:
        raise ValueError("❌ Não foi possível ler o frame sample")
        
    out_height, out_width = sample_frame.shape[:2]
    final_width = target_width if target_width else out_width
    final_height = target_height if target_height else out_height
    
    # Garantir que o diretório de saída existe
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        log_message(f"📁 Criado diretório: {output_dir}")
    
    # Usar codec mais eficiente
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    temp_video = output_path.replace(".mp4", "_no_audio.mp4")
    
    log_message(f"🎬 Criando vídeo: {temp_video}")
    log_message(f"📏 Resolução: {final_width}x{final_height}")
    log_message(f"🎞️ FPS: {fps}")
    
    out = cv2.VideoWriter(temp_video, fourcc, fps, (final_width, final_height))
    
    if not out.isOpened():
        raise ValueError(f"❌ Não foi possível criar o vídeo: {temp_video}")
    
    try:
        log_message("📼 Montando vídeo final (sem áudio)...")
        for i, frame_file in enumerate(upscaled_frame_files):
            frame_path = os.path.join(tmp_dir, frame_file)
            frame = cv2.imread(frame_path)
            
            if frame is None:
                log_message(f"⚠️ Não foi possível ler frame: {frame_file}", "warning")
                continue
                
            if frame.shape[1] != final_width or frame.shape[0] != final_height:
                frame = cv2.resize(frame, (final_width, final_height), interpolation=cv2.INTER_LANCZOS4)
            
            out.write(frame)
            
            if (i + 1) % 50 == 0:
                progress = 80 + ((i + 1) / len(upscaled_frame_files)) * 15
                progress_update(progress, f"Montando vídeo: {i + 1}/{len(upscaled_frame_files)} frames", "video_assembly")
                
    except Exception as e:
        log_message(f"❌ Erro ao montar vídeo: {e}", "error")
        raise
    finally:
        out.release()
    
    log_message(f"✅ Vídeo sem áudio montado: {temp_video}")
    
    # Verificar se o arquivo foi criado
    if not os.path.exists(temp_video):
        raise ValueError(f"❌ Vídeo temporário não foi criado: {temp_video}")
    
    log_message(f"📊 Tamanho do vídeo: {os.path.getsize(temp_video) / (1024*1024):.2f} MB")
    return temp_video

def signal_handler(sig, frame):
    log_message('\n\n⚠️  Processamento interrompido pelo usuário!', "warning")
    sys.exit(0)

def process_video(input_path, output_path, scale=2, use_gpu=True, gpu_memory_limit=None):
    """Função principal para processar o vídeo."""
    exe_path = os.path.join(BASE_DIR, "realesrgan_portable",
                            "realesrgan-ncnn-vulkan-20220424-windows",
                            "realesrgan-ncnn-vulkan.exe")
    tmp_folder = "tmp_frames"

    if not os.path.exists(exe_path):
        raise FileNotFoundError(f"❌ Executável Real-ESRGAN não encontrado: {exe_path}")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"❌ Arquivo não encontrado: {input_path}")

    # 🔥 CORREÇÃO CRÍTICA: Garantir que o output_path seja absoluto e tenha extensão .mp4
    if not output_path.endswith('.mp4'):
        output_path += '.mp4'
    
    # Garantir que o diretório de saída existe
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        log_message(f"📁 Criado diretório de saída: {output_dir}")

    log_message(f"🎯 Arquivo de saída: {output_path}")

    temp_audio = os.path.join(BASE_DIR, "temp_audio.aac")

    try:
        log_message("🎬 Iniciando upscale do vídeo...")
        progress_update(0, "Iniciando processamento...")

        # Extrair áudio
        log_message("🔊 Extraindo áudio do vídeo original...")
        has_audio = extract_audio(input_path, temp_audio)
        progress_update(10, "Áudio extraído")

        # Limpar pasta temporária
        clean_temp_folder(tmp_folder)

        # Informações do vídeo
        fps, frame_count, width, height = get_video_info(input_path)
        log_message(f"📊 Informações do vídeo:")
        log_message(f"   - Frames: {frame_count}")
        log_message(f"   - Resolução original: {width}x{height}")
        log_message(f"   - FPS: {fps:.2f}")

        # Enviar métricas iniciais
        metrics_data = {
            "type": "metrics",
            "metrics": {
                "totalFrames": frame_count,
                "fps": fps,
                "originalWidth": width,
                "originalHeight": height,
                "currentStage": "extracting_frames"
            }
        }
        print(json.dumps(metrics_data))

        # Resolução final
        final_width, final_height = None, None
        if scale == 2:
            final_width, final_height = calculate_target_resolution(width, height, 1080)
            log_message(f"   - Resolução final: {final_width}x{final_height}")

        # Extrair frames
        log_message("🎞️ Extraindo frames do vídeo...")
        extracted_frames = extract_frames(input_path, tmp_folder)
        if extracted_frames == 0:
            raise ValueError("❌ Nenhum frame foi extraído do vídeo")
        progress_update(30, "Frames extraídos")

        # Aplicar upscale OTIMIZADO
        log_message("🚀 Iniciando upscale otimizado...")
        successful_frames = upscale_frames_optimized(tmp_folder, exe_path, scale, gpu_memory_limit)

        if successful_frames > 0:
            progress_update(80, "Upscale concluído, montando vídeo...")

            # Criar vídeo final
            temp_video = create_output_video(tmp_folder, output_path, fps, final_width, final_height)

            progress_update(95, "Vídeo montado, adicionando áudio...")

            # Adicionar áudio
            if has_audio and os.path.exists(temp_audio):
                log_message("🔊 Adicionando áudio ao vídeo final...")
                if add_audio_to_video(temp_video, temp_audio, output_path):
                    log_message("✅ Áudio adicionado com sucesso!")
                    # Remover vídeo temporário
                    if os.path.exists(temp_video):
                        os.remove(temp_video)
                else:
                    log_message("❌ Falha ao adicionar áudio, mantendo vídeo sem áudio", "warning")
                    # Renomear vídeo temporário para o nome final
                    if os.path.exists(temp_video):
                        os.rename(temp_video, output_path)
            else:
                log_message("ℹ️ Nenhum áudio para adicionar")
                # Renomear vídeo temporário para o nome final
                if os.path.exists(temp_video):
                    os.rename(temp_video, output_path)

            # Verificar se o arquivo final foi criado
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path) / (1024*1024)
                log_message(f"✅ Vídeo final criado: {output_path} ({file_size:.2f} MB)", "success")
                progress_update(100, "Processamento concluído!")
            else:
                raise ValueError("❌ Vídeo final não foi criado")

        else:
            raise ValueError("❌ Nenhum frame foi processado com sucesso")

    except Exception as e:
        log_message(f"❌ Erro durante o processamento: {e}", "error")
        raise
    finally:
        # Limpeza
        tmp_path = os.path.join(BASE_DIR, tmp_folder)
        if os.path.exists(tmp_path):
            log_message("🧹 Limpando arquivos temporários...")
            shutil.rmtree(tmp_path)
        if os.path.exists(temp_audio):
            os.remove(temp_audio)

def main():
    signal.signal(signal.SIGINT, signal_handler)

    # Lê os parâmetros de entrada via stdin
    input_data = sys.stdin.read()
    
    try:
        config = json.loads(input_data)
        
        # Obter caminhos da configuração
        input_path = config['inputPath']
        output_path = config['outputPath']
        scale = config.get('scale', 2)
        use_gpu = config.get('useGpu', True)
        gpu_memory_limit = config.get('gpuMemory')  # Em MB

        log_message(f"📥 Configuração recebida:")
        log_message(f"   - inputPath: {input_path}")
        log_message(f"   - outputPath: {output_path}")
        log_message(f"   - scale: {scale}")
        log_message(f"   - useGpu: {use_gpu}")
        log_message(f"   - gpuMemory: {gpu_memory_limit}")

        # CORREÇÃO: Se os caminhos são relativos, converter para absolutos
        if not os.path.isabs(input_path):
            original_input = input_path
            input_path = os.path.join(BASE_DIR, "uploads", os.path.basename(input_path))
            log_message(f"🔁 Convertendo caminho relativo para absoluto:")
            log_message(f"   - Original: {original_input}")
            log_message(f"   - Absoluto: {input_path}")
        
        if not os.path.isabs(output_path):
            original_output = output_path
            output_dir = os.path.join(BASE_DIR, "outputs")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, os.path.basename(output_path))
            log_message(f"🔁 Convertendo caminho relativo para absoluto:")
            log_message(f"   - Original: {original_output}")
            log_message(f"   - Absoluto: {output_path}")

        log_message(f"📁 Caminho de entrada resolvido: {input_path}")
        log_message(f"📁 Caminho de saída resolvido: {output_path}")
        log_message(f"📁 Arquivo de entrada existe: {os.path.exists(input_path)}")

        # Verificar se o arquivo de entrada existe
        if not os.path.exists(input_path):
            log_message(f"❌ ARQUIVO NÃO ENCONTRADO - Investigação:")
            log_message(f"   - Caminho procurado: {input_path}")
            log_message(f"   - Diretório: {os.path.dirname(input_path)}")
            log_message(f"   - Diretório existe: {os.path.exists(os.path.dirname(input_path))}")
            
            if os.path.exists(os.path.dirname(input_path)):
                files = os.listdir(os.path.dirname(input_path))
                log_message(f"   - Arquivos no diretório: {files}")
            
            # Tentar encontrar o arquivo de outras formas
            uploads_dir = os.path.join(BASE_DIR, "uploads")
            if os.path.exists(uploads_dir):
                all_files = os.listdir(uploads_dir)
                log_message(f"   - Todos os arquivos em uploads: {all_files}")
            
            raise FileNotFoundError(f"❌ Arquivo não encontrado: {input_path}")

        process_video(input_path, output_path, scale, use_gpu, gpu_memory_limit)
        
    except json.JSONDecodeError as e:
        log_message(f"❌ Erro ao decodificar JSON: {str(e)}", "error")
        log_message(f"❌ Dados recebidos: {input_data}", "error")
        sys.exit(1)
    except Exception as e:
        log_message(f"❌ Erro: {str(e)}", "error")
        sys.exit(1)

if __name__ == "__main__":
    main()