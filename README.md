# 🎬 Video Converter
Aplicativo de conversão de vídeos que utiliza IA para realizar upscale, preserva o áudio original e permite escolher qual memória da GPU será utilizada, além da escala do upscale.

## ✨ Funcionalidades Resumidas

- **Upscale de Vídeos:** Melhora a resolução de vídeos usando IA (Real-ESRGAN).  
- **Escalas de Upscale:** Suporte a 2x, 3x e 4x.  
- **Multilíngue:** Disponível em Português (BR), Espanhol e Inglês.  
- **Logs em Tempo Real:** Visualize o progresso do processamento e possíveis erros.  
- **Escolha do Destino do Arquivo:** Salve o vídeo processado onde desejar.  
- **Gerenciamento de GPU:** Selecione qual memória da placa de vídeo será utilizada para o processamento.

---
## 🛠️ Tecnologias Utilizadas

### Backend (Python)
| Pacote | Versão | Função |
|--------|--------|--------|
| opencv-python | 4.8.1.78 | Processamento de vídeo e imagens, leitura/escrita de frames. |
| Pillow | 10.0.0 | Manipulação de imagens, conversão, redimensionamento. |
| numpy | 1.24.3 | Computação numérica, manipulação de arrays. |
| moviepy | 1.0.3 | Edição de vídeo e áudio, preservação do áudio original. |
| imageio | 2.31.1 | Suporte a diversos formatos de imagem, usado pelo moviepy. |
| imageio-ffmpeg | 0.4.8 | Interface para FFmpeg dentro do moviepy. |
| ffmpeg-python | 0.2.0 | Alternativa para integração com FFmpeg via Python (opcional). |
| scipy | 1.10.1 | Funções científicas e de performance, processamento avançado de dados. |
| scikit-image | 0.21.0 | Processamento de imagem avançado, filtros, melhorias. |
| tqdm | 4.66.1 | Barras de progresso no terminal. |
| psutil | 5.9.6 | Monitoramento de recursos do sistema (CPU, memória, GPU). |
| colorama | 0.4.6 | Colorização de mensagens no terminal para melhor visualização. |

### Frontend (React + Electron + TypeScript + Tailwind)
| Pacote | Versão | Função |
|--------|--------|--------|
| react | ^18.2.0 | Biblioteca principal para interface de usuário. |
| react-dom | ^18.2.0 | Integração do React com o DOM. |
| @types/react | ^18.2.15 | Tipagens TypeScript para React. |
| @types/react-dom | ^18.2.7 | Tipagens TypeScript para React-DOM. |
| @vitejs/plugin-react | ^4.0.3 | Plugin Vite para React, hot reload e JSX. |
| autoprefixer | ^10.4.14 | Adiciona prefixos CSS automaticamente para compatibilidade. |
| concurrently | ^7.6.0 | Permite rodar múltiplos scripts npm simultaneamente. |
| electron | ^22.3.27 | Framework para criar aplicativos desktop multiplataforma. |
| electron-builder | ^24.13.3 | Empacotamento e criação de instaladores do Electron. |
| eslint | ^8.45.0 | Linting para manter qualidade e padronização do código. |
| eslint-plugin-react-hooks | ^4.6.0 | Regras para hooks do React, evitando erros comuns. |
| eslint-plugin-react-refresh | ^0.4.3 | Integração com hot reload do React. |
| postcss | ^8.4.27 | Processamento CSS, usado com Tailwind. |
| tailwindcss | ^3.3.3 | Framework CSS utilitário para design rápido. |
| typescript | ^5.0.2 | Superset do JavaScript, adiciona tipagem estática. |
| vite | ^4.4.5 | Bundler moderno para desenvolvimento rápido e build. |
| wait-on | ^7.0.1 | Aguarda recursos (URLs, arquivos) estarem disponíveis antes de continuar scripts. |
---
## 📦 4. Instalação e Uso

### Pré-requisitos
- Node.js 18+ e npm
- Python 3.8+ (para o backend)
- NVIDIA GPU (opcional, para acelerar o upscale)
- Windows 10/11 (testado)

### Passo a Passo

1. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/VideoConverterApp.git
cd VideoConverterApp
```
2. **Instale as dependências do backend:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
3.**Instale as dependências do frontend:**
```bash
cd ../frontend
npm install
```
4.**Crie o build do aplicativo desktop:**
```bash
npm run dist
```
Isto vai gerar uma pasta dist com o instalador e o aplicativo pronto.

---
## ⚙️ 5. Configurações e Observações

### 💻 Seleção de memória da GPU
O aplicativo permite escolher quanta memória da GPU será utilizada para o processamento.  
- Use GPUs com mais VRAM para vídeos maiores ou upscale em 4x.
- Para GPUs com pouca memória, escolha valores menores para evitar erros ou travamentos.

### 📜 Logs de Processamento
- Todos os processos de upscale são registrados em logs.
- É possível verificar o andamento e identificar erros diretamente pelo painel de logs do app.
- Os logs ajudam a diagnosticar problemas e otimizar configurações.

### 🌐 Idiomas Disponíveis
O app suporta três idiomas:
- Português (Brasil)  
- Espanhol  
- Inglês  

O idioma pode ser alterado diretamente nas configurações do aplicativo.

### 💾 Escolha de Pasta de Saída
- O usuário pode definir onde os vídeos processados serão salvos.
- Isso permite organizar melhor os arquivos e escolher unidades com espaço suficiente.
- Evite pastas com caracteres especiais ou caminhos muito longos para prevenir erros no Windows.

### ⚠️ Observações Gerais
- Sempre mantenha espaço livre suficiente no disco, especialmente para vídeos 4K.
- Para processamentos longos, recomenda-se usar SSD.
- Feche outros aplicativos pesados para liberar memória e VRAM.

## 🔗 Links Úteis

- [Documentação do Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) – Para entender melhor o motor de upscale usado.  
- [Documentação do Electron](https://www.electronjs.org/docs/latest/) – Para quem quiser explorar o framework desktop.  
- [Tutoriais e exemplos de React + Electron](https://www.electronjs.org/community) – Exemplos de apps e melhores práticas.


## 🤝 Contribuição
Contribuições são bem-vindas! Você pode:
- Reportar bugs ou sugerir melhorias
- Ajudar na interface ou otimização
- Adicionar novos idiomas ou recursos



