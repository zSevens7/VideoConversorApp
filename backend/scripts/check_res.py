import sys
import subprocess

video_path = sys.argv[1]

result = subprocess.run(
    ["ffprobe", "-v", "error", "-select_streams", "v:0",
     "-show_entries", "stream=width,height", "-of", "csv=p=0", video_path],
    capture_output=True, text=True
)

width, height = result.stdout.strip().split(',')
print(f"Resolução do vídeo: {width}x{height}")
