const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

function createWindow() {
  // Platforma özel ikon yolu oluşturma.
  // Windows için 'icon.ico', diğerleri için 'icon.png' kullanılması önerilir.
  // Eğer sadece .ico dosyanız varsa, 'icon.ico' olarak bırakabilirsiniz.
  // İkon dosyanızın projenizin ana dizininde olduğundan emin olun.
  const iconPath = path.join(__dirname, 'icon.ico');

  // İkon yolunun doğru oluşturulup oluşturulmadığını kontrol etmek için konsola yazdırabilirsiniz.
  console.log(`Kullanılan ikon yolu: ${iconPath}`);

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    icon: iconPath, // Düzeltilmiş yolu burada kullanıyoruz
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Ekran kaynaklarını al
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 300, height: 200 }
    });
    return sources;
  } catch (error) {
    console.error('Kaynaklar alınamadı:', error);
    return [];
  }
});

// Dosya kaydetme yeri seçimi
ipcMain.handle('choose-save-location', async (event, defaultName) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      buttonLabel: 'Kaydet',
      defaultPath: defaultName,
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'WebM Video', extensions: ['webm'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ]
    });
    return filePath;
  } catch (error) {
    console.error('Dosya yolu seçilemedi:', error);
    return null;
  }
});

// Dosya kaydetme (genel)
ipcMain.handle('save-video-file', async (event, arrayBuffer, filePath) => {
  try {
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: filePath };
  }
  catch (error) {
    console.error('Dosya kaydedilemedi:', error);
    return { success: false, error: error.message };
  }
});

// WebM dosyasını doğrudan kaydet (dönüştürme yapmadan)
ipcMain.handle('save-webm-file', async (event, arrayBuffer, filePath) => {
  try {
    // Dosya uzantısını kontrol et ve gerekirse değiştir
    let outputPath = filePath;
    if (!outputPath.toLowerCase().endsWith('.webm')) {
      outputPath = outputPath.replace(/.[^/.]+$/, '') + '.webm';
    }

    // WebM dosyasını doğrudan kaydet
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('WebM dosyası kaydedilemedi:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});