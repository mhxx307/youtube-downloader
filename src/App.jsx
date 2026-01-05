import { useEffect, useState } from 'react';

const defaultMode = 'both';
const defaultQuality = 'best';

function App() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState(defaultMode);
  const [quality, setQuality] = useState(defaultQuality);
  const [outputDir, setOutputDir] = useState('');
  const [log, setLog] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [binaryStatus, setBinaryStatus] = useState(null);

  useEffect(() => {
    async function init() {
      if (!window.downloader) return;
      // Load saved config (outputDir) first
      try {
        const cfgRes = await window.downloader.getConfig();
        if (cfgRes?.success && cfgRes.config?.outputDir) {
          setOutputDir(cfgRes.config.outputDir);
        }
      } catch {
        // ignore
      }

      const info = await window.downloader.ensureBinaries();
      setBinaryStatus(info);

      window.downloader.onProgress((line) => {
        setLog((prev) => prev + line);
      });
      window.downloader.onFinished((result) => {
        setIsDownloading(false);
        setLog((prev) =>
          prev +
          `\n=== FINISHED ===\n` +
          (result.success ? 'Download thành công.\n' : `Download thất bại (code ${result.code}).\n`)
        );
      });
    }
    init();
  }, []);

  const pickFolder = async () => {
    if (!window.downloader) return;
    const folder = await window.downloader.pickFolder();
    if (folder) setOutputDir(folder);
  };

  const startDownload = async () => {
    if (!window.downloader) return;
    if (!url.trim()) {
      alert('Nhập URL YouTube');
      return;
    }
    if (!outputDir) {
      alert('Chọn thư mục lưu');
      return;
    }
    setIsDownloading(true);
    setLog('');
    const res = await window.downloader.startDownload({
      url: url.trim(),
      mode,
      quality,
      outputDir,
    });
    if (!res.success) {
      setIsDownloading(false);
      setLog(`Lỗi: ${res.error}\n`);
    }
  };

  const renderBinaryStatus = () => {
    if (!binaryStatus) return null;
    if (!binaryStatus.success) {
      return <p className="text-red-600 text-sm">Không tải được yt-dlp/ffmpeg: {binaryStatus.error}</p>;
    }
    return (
      <div className="text-xs text-gray-600 space-y-1">
        <p>yt-dlp: {binaryStatus.ytdlpPath}</p>
        {binaryStatus.ffmpeg?.status === 'ok' && <p>ffmpeg: {binaryStatus.ffmpeg.path}</p>}
        {binaryStatus.ffmpeg?.status === 'system' && <p>ffmpeg: dùng ffmpeg trong PATH hệ thống</p>}
        {binaryStatus.ffmpeg?.status === 'missing' && (
          <p className="text-red-600">
            Không tìm thấy ffmpeg. Hãy chạy script tải ffmpeg và giải nén `ffmpeg.exe` vào
            thư mục `electron/bin` hoặc cài ffmpeg vào PATH.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">YT Downloader</h1>
          <p className="text-xs text-slate-300">
            Tải YouTube: âm thanh, video, hoặc cả hai với chất lượng tốt.
          </p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        <section className="bg-white rounded shadow p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">YouTube URL</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kiểu download</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="audio">Chỉ âm thanh (mp3)</option>
                <option value="video">Chỉ video (không âm thanh)</option>
                <option value="both">Video + âm thanh</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Chất lượng</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                <option value="best">Tốt nhất</option>
                <option value="high">Cao (≤1080p)</option>
                <option value="medium">Trung bình (≤720p)</option>
                <option value="low">Thấp (≤480p)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Thư mục lưu</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm bg-gray-100"
                value={outputDir}
                readOnly
                placeholder="Chưa chọn"
              />
            </div>
            <button
              type="button"
              onClick={pickFolder}
              className="mt-5 inline-flex items-center px-3 py-1.5 text-sm rounded bg-slate-800 text-white hover:bg-slate-700"
            >
              Chọn thư mục
            </button>
          </div>

          {renderBinaryStatus()}

          <div className="pt-2">
            <button
              type="button"
              disabled={isDownloading}
              onClick={startDownload}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded ${
                isDownloading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isDownloading ? 'Đang tải...' : 'Download'}
            </button>
          </div>
        </section>

        <section className="bg-black rounded shadow p-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-200">Tiến trình / Log</span>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setLog('')}
            >
              Xóa log
            </button>
          </div>
          <pre className="flex-1 overflow-auto text-xs text-gray-100 whitespace-pre-wrap">
            {log || 'Chưa có log.'}
          </pre>
        </section>
      </main>
    </div>
  );
}

export default App;


