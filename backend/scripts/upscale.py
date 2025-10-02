import os
import cv2
import subprocess
import shutil
import sys
import signal
import io
import json
import time
import numpy as np  # Adicionar esta linha com os outros imports
from concurrent.futures import ThreadPoolExecutor, as_completed

# ----------------------------
# Forçar flush automático em todos os prints
# ----------------------------
# ----------------------------
# Forçar flush automático em todos os prints
# ----------------------------
import builtins

# Salvar a referência original do print
_original_print = builtins.print

# Redefinir print para sempre dar flush
def print(*args, **kwargs):
    kwargs['flush'] = True
    _original_print(*args, **kwargs)

# Forçar stdout e stderr em UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def log_message(message, type="log"):
    log_entry = {"type": type, "message": message, "timestamp": time.time()}
    print(json.dumps(log_entry))

def progress_update(progress, message=None, stage=None):
    progress_entry = {"type": "progress", "progress": progress, "message": message, "stage": stage, "timestamp": time.time()}
    print(json.dumps(progress_entry))

def setup_directories():
    uploads_dir = os.path.join(BASE_DIR, "uploads")
    outputs_dir = os.path.join(BASE_DIR, "outputs")
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(outputs_dir, exist_ok=True)

def clean_temp_folder(tmp_folder):
    tmp_path = os.path.join(BASE_DIR, tmp_folder)
    if os.path.exists(tmp_path):
        shutil.rmtree(tmp_path)
    os.makedirs(tmp_path, exist_ok=True)

def get_video_info(input_path):
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
    try:
        cmd = ["ffmpeg", "-i", input_video, "-vn", "-acodec", "copy", output_audio, "-y"]
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
    try:
        if not os.path.exists(video_path) or not os.path.exists(audio_path):
            log_message("❌ Arquivo de vídeo ou áudio não encontrado", "error")
            return False
        cmd = [
            "ffmpeg", "-i", video_path, "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", output_path, "-y"
        ]
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
    cap = cv2.VideoCapture(input_path)
    frame_idx = 0
    log_message("Extraindo frames do vídeo...")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        tmp_input = os.path.join(BASE_DIR, tmp_folder, f"frame_{frame_idx:06d}.png")
        cv2.imwrite(tmp_input, frame)
        frame_idx += 1
        if frame_idx % 30 == 0:
            log_message(f"Extraídos {frame_idx} frames...")
            progress_update(10 + (frame_idx / 1000) * 20, f"Extraídos {frame_idx} frames", "extracting")
    cap.release()
    log_message(f"Total de {frame_idx} frames extraídos.")
    return frame_idx

def get_gpu_memory():
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total,memory.used", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split("\n")
            for line in lines:
                total_mem, used_mem = map(int, line.split(", "))
                available_mem = total_mem - used_mem
                log_message(f"🎮 GPU: {total_mem}MB total, {used_mem}MB usado, {available_mem}MB disponível")
                return available_mem
    except Exception as e:
        log_message(f"⚠️ Não foi possível detectar memória GPU: {e}", "warning")
    return 6144  # Fallback para 6GB disponíveis

def choose_optimal_settings(gpu_memory_mb):
    """CONFIGURAÇÃO OTIMIZADA PARA 8GB GPU + 6 CORE CPU"""
    if gpu_memory_mb >= 7000:
        settings = {
            "j_value": "1:1:1",      # MÍNIMO de threads CPU
            "batch_size": 2,         # Processa DOIS frames por vez -> MUDEI AQUI
            "tile_size": 0,          # Tile automático (imagem inteira)
            "num_threads": 2,        # 2 threads para os 2 processos -> MUDEI AQUI
            "gpu_id": "0",           # GPU 0
            "prefetch": 0            # Sem prefetch
        }
        log_message("🚀 CONFIGURAÇÃO: MÁXIMA PERFORMANCE GPU (8GB) - BATCH=2")
    elif gpu_memory_mb >= 4000:
        settings = {
            "j_value": "1:1:1",
            "batch_size": 2,
            "tile_size": 400,
            "num_threads": 2,
            "gpu_id": "0",
            "prefetch": 0
        }
        log_message("⚡ Configuração: Balanceada")
    else:
        settings = {
            "j_value": "1:1:1", 
            "batch_size": 2,
            "tile_size": 256,
            "num_threads": 2,
            "gpu_id": "0",
            "prefetch": 0
        }
        log_message("🔧 Configuração: Conservadora")
    return settings

def test_gpu_acceleration(exe_path):
    """Testa se a GPU está funcionando"""
    log_message("🧪 Testando aceleração por GPU...")
    try:
        # Cria um frame de teste pequeno
        test_frame = os.path.join(BASE_DIR, "test_frame.png")
        cv2.imwrite(test_frame, np.ones((100, 100, 3), dtype=np.uint8) * 128)
        
        cmd = [exe_path, "-i", test_frame, "-o", test_frame.replace(".png", "_out.png"), 
               "-s", "2", "-f", "png", "-g", "0"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        # Limpa
        if os.path.exists(test_frame):
            os.remove(test_frame)
        if os.path.exists(test_frame.replace(".png", "_out.png")):
            os.remove(test_frame.replace(".png", "_out.png"))
            
        if result.returncode == 0:
            log_message("✅ GPU funcionando corretamente!")
            return True
        else:
            log_message(f"❌ GPU test failed: {result.stderr}", "warning")
            return False
    except Exception as e:
        log_message(f"❌ Erro no teste GPU: {e}", "error")
        return False

def process_single_frame_sequential(frame_file, tmp_dir, exe_path, scale, settings):
    """Processa frames SEQUENCIALMENTE para maximizar GPU"""
    tmp_input = os.path.join(tmp_dir, frame_file)
    frame_number = frame_file.replace("frame_", "").replace(".png", "")
    tmp_output = os.path.join(tmp_dir, f"frame_up_{frame_number}.png")
    
    if os.path.exists(tmp_output):
        return True
        
    # COMANDO OTIMIZADO - MÁXIMA GPU, MÍNIMA CPU
    cmd = [
        exe_path,
        "-i", tmp_input,
        "-o", tmp_output, 
        "-s", str(scale),
        "-f", "png",
        "-g", settings["gpu_id"],    # Força GPU
        "-j", settings["j_value"]    # Mínimo de threads CPU
    ]
    
    # Tile size apenas se necessário
    if settings["tile_size"] > 0:
        cmd.extend(["-t", str(settings["tile_size"])])
    
    try:
        # Timeout maior para processamento GPU
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)  # 5 minutos
        
        if result.returncode == 0:
            return True
        else:
            error_msg = result.stderr.lower()
            if "out of memory" in error_msg:
                log_message(f"💥 Out of Memory no frame {frame_file}", "error")
            elif "cuda" in error_msg or "gpu" in error_msg:
                log_message(f"❌ Erro GPU no frame {frame_file}: {error_msg}", "error")
            return False
            
    except subprocess.TimeoutExpired:
        log_message(f"⏰ Timeout no frame {frame_file}", "warning")
        return False
    except Exception as e:
        log_message(f"⚠️ Erro no frame {frame_file}: {e}", "warning")
        return False

def upscale_frames_optimized(tmp_folder, exe_path, scale=2, gpu_memory_limit=None):
    tmp_dir = os.path.join(BASE_DIR, tmp_folder)
    frame_files = sorted([f for f in os.listdir(tmp_dir) if f.startswith("frame_") and f.endswith(".png") and not f.startswith("frame_up_")])
    
    if not frame_files:
        log_message("❌ Nenhum frame encontrado para upscale", "error")
        return 0
    
    log_message(f"🚀 Iniciando upscale para {len(frame_files)} frames...")
    gpu_memory = gpu_memory_limit if gpu_memory_limit else get_gpu_memory()
    settings = choose_optimal_settings(gpu_memory)
    
    log_message(f"⚙️ Configurações: batch_size={settings['batch_size']}, num_threads={settings['num_threads']}")

    successful_frames = 0
    failed_frames = 0

    # 🔥 DECIDE ENTSE SEQUENCIAL E PARALELO
    if settings['batch_size'] == 1:
        log_message("🔁 MODO: PROCESSAMENTO SEQUENCIAL")
        # Processamento sequencial (um por um)
        for i, frame_file in enumerate(frame_files):
            success = process_single_frame_sequential(frame_file, tmp_dir, exe_path, scale, settings)
            if success:
                successful_frames += 1
            else:
                failed_frames += 1
            
            progress = 30 + ((i + 1) / len(frame_files)) * 50
            progress_update(progress, f"GPU: {successful_frames}/{len(frame_files)} frames", "upscaling")
            
            if (i + 1) % 10 == 0:
                log_message(f"📊 Progresso: {i + 1}/{len(frame_files)} frames")
    else:
        log_message(f"🔁 MODO: PROCESSAMENTO PARALELO (batch_size={settings['batch_size']})")
        # Processamento paralelo com ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=settings['num_threads']) as executor:
            futures = []
            
            # Submete todos os frames para processamento paralelo
            for frame_file in frame_files:
                future = executor.submit(process_single_frame_sequential, frame_file, tmp_dir, exe_path, scale, settings)
                futures.append(future)
            
            # Coleta os resultados conforme terminam
            for i, future in enumerate(as_completed(futures)):
                try:
                    success = future.result()
                    if success:
                        successful_frames += 1
                    else:
                        failed_frames += 1
                except Exception as e:
                    log_message(f"❌ Erro no frame: {e}", "error")
                    failed_frames += 1
                
                progress = 30 + ((i + 1) / len(frame_files)) * 50
                progress_update(progress, f"GPU: {successful_frames}/{len(frame_files)} frames", "upscaling")
                
                if (i + 1) % 10 == 0:
                    log_message(f"📊 Progresso: {i + 1}/{len(frame_files)} frames")

    log_message(f"🎯 RESULTADO: {successful_frames} sucessos, {failed_frames} falhas")
    return successful_frames




def calculate_target_resolution(original_width, original_height, target_height=1080):
    aspect_ratio = original_width / original_height
    target_width = int(target_height * aspect_ratio)
    target_width = target_width if target_width % 2 == 0 else target_width + 1
    target_height = target_height if target_height % 2 == 0 else target_height + 1
    return target_width, target_height

def create_output_video(tmp_folder, output_path, fps, target_width=None, target_height=None):
    tmp_dir = os.path.join(BASE_DIR, tmp_folder)
    upscaled_frame_files = sorted([f for f in os.listdir(tmp_dir) if f.startswith("frame_up_") and f.endswith(".png")])
    
    if not upscaled_frame_files:
        raise ValueError("❌ Nenhum frame upscaled encontrado")
        
    first_frame_path = os.path.join(tmp_dir, upscaled_frame_files[0])
    sample_frame = cv2.imread(first_frame_path)
    out_height, out_width = sample_frame.shape[:2]
    final_width = target_width if target_width else out_width
    final_height = target_height if target_height else out_height

    log_message(f"🎬 Montando vídeo {final_width}x{final_height} a {fps}fps")
    
    # Garantir diretório de saída
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    temp_video = output_path.replace(".mp4", "_no_audio.mp4")
    out = cv2.VideoWriter(temp_video, fourcc, fps, (final_width, final_height))

    try:
        for idx, frame_file in enumerate(upscaled_frame_files):
            frame_path = os.path.join(tmp_dir, frame_file)
            frame = cv2.imread(frame_path)
            if frame is None:
                continue
            if frame.shape[1] != final_width or frame.shape[0] != final_height:
                frame = cv2.resize(frame, (final_width, final_height))
            out.write(frame)
            
            if (idx + 1) % 50 == 0:
                progress = 80 + ((idx + 1) / len(upscaled_frame_files)) * 15
                progress_update(progress, f"Montando vídeo: {idx + 1}/{len(upscaled_frame_files)}", "rendering")
    finally:
        out.release()
    
    return temp_video

def signal_handler(sig, frame):
    log_message('\n\n⚠️ Processamento interrompido pelo usuário!', "warning")
    sys.exit(0)

def process_video(input_path, output_path, scale=2, use_gpu=True, gpu_memory_limit=None):
    """Função principal OTIMIZADA"""
    exe_path = os.path.join(BASE_DIR, "realesrgan_portable", "realesrgan-ncnn-vulkan-20220424-windows", "realesrgan-ncnn-vulkan.exe")
    tmp_folder = "tmp_frames"
    
    if not os.path.exists(exe_path):
        raise FileNotFoundError(f"❌ Executável não encontrado: {exe_path}")
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"❌ Arquivo não encontrado: {input_path}")

    # Garantir extensão .mp4
    if not output_path.endswith('.mp4'):
        output_path += '.mp4'
        
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    temp_audio = os.path.join(BASE_DIR, "temp_audio.aac")
    
    try:
        log_message("🎬 Iniciando processamento OTIMIZADO...")
        progress_update(0, "Iniciando...")

        # Extrair áudio primeiro
        log_message("🔊 Extraindo áudio...")
        has_audio = extract_audio(input_path, temp_audio)
        progress_update(10, "Áudio extraído")

        # Limpar pasta temporária
        clean_temp_folder(tmp_folder)

        # Informações do vídeo
        fps, frame_count, width, height = get_video_info(input_path)
        log_message(f"📊 Vídeo: {frame_count} frames, {width}x{height}, {fps}fps")

        # Extrair frames
        log_message("🎞️ Extraindo frames...")
        extracted_frames = extract_frames(input_path, tmp_folder)
        progress_update(30, "Frames extraídos")

        # 🔥 UPSCALE OTIMIZADO - SEQUENCIAL
        log_message("🚀 INICIANDO UPSCALE SEQUENCIAL...")
        successful_frames = upscale_frames_optimized(tmp_folder, exe_path, scale, gpu_memory_limit)
        
        if successful_frames > 0:
            progress_update(80, "Upscale concluído, montando vídeo...")
            
            # Calcular resolução final
            final_width, final_height = calculate_target_resolution(width, height, 1080)
            
            # Criar vídeo
            temp_video = create_output_video(tmp_folder, output_path, fps, final_width, final_height)
            progress_update(95, "Vídeo montado, adicionando áudio...")

            # Adicionar áudio
            if has_audio and os.path.exists(temp_audio):
                log_message("🔊 Adicionando áudio...")
                if add_audio_to_video(temp_video, temp_audio, output_path):
                    log_message("✅ Áudio adicionado!")
                    os.remove(temp_video)  # Remove temp
                else:
                    os.rename(temp_video, output_path)  # Renomeia sem áudio
            else:
                os.rename(temp_video, output_path)

            # Verificar resultado
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path) / (1024*1024)
                log_message(f"✅ CONCLUÍDO: {output_path} ({file_size:.2f} MB)", "success")
                progress_update(100, "Processamento concluído!")
            else:
                raise ValueError("❌ Vídeo final não criado")
        else:
            raise ValueError("❌ Nenhum frame processado")

    except Exception as e:
        log_message(f"❌ Erro: {e}", "error")
        raise
    finally:
        # Limpeza
        tmp_path = os.path.join(BASE_DIR, tmp_folder)
        if os.path.exists(tmp_path):
            shutil.rmtree(tmp_path)
        if os.path.exists(temp_audio):
            os.remove(temp_audio)

def main():
    signal.signal(signal.SIGINT, signal_handler)
    
    input_data = sys.stdin.read()
    try:
        config = json.loads(input_data)
        
        input_path = config['inputPath']
        output_path = config['outputPath']
        scale = config.get('scale', 2)
        use_gpu = config.get('useGpu', True)
        gpu_memory_limit = config.get('gpuMemory')

        log_message(f"🎯 Configuração: scale={scale}, GPU={use_gpu}, Memória={gpu_memory_limit}MB")

        # Converter caminhos relativos para absolutos
        if not os.path.isabs(input_path):
            input_path = os.path.join(BASE_DIR, "uploads", os.path.basename(input_path))
        if not os.path.isabs(output_path):
            output_dir = os.path.join(BASE_DIR, "outputs")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, os.path.basename(output_path))

        process_video(input_path, output_path, scale, use_gpu, gpu_memory_limit)
        
    except Exception as e:
        log_message(f"❌ Erro: {str(e)}", "error")
        sys.exit(1)

if __name__ == "__main__":
    main()