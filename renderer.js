class ScreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordRTC = null;
        this.recordedChunks = [];
        this.selectedSource = null;
        this.microphoneStream = null;
        this.screenStream = null;
        this.combinedStream = null;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.micEnabled = false;
        
        // Audio mixing için
        this.audioContext = null;
        this.micGainNode = null;
        this.systemGainNode = null;
        this.mixerNode = null;
        this.destination = null;
        
        this.previewStream = null;
        
        // Mikrofon ayarları
        this.microphoneDevices = [];
        this.selectedMicrophone = null;
        this.microphoneGain = parseFloat(localStorage.getItem('microphoneGain')) || 1.0;
        
        // Test stream'leri
        this.testStream = null;
        this.testAudioContext = null;
        
        // Video ayarları
        this.videoSettings = {
            resolution: '1920x1080',
            fps: 60,
            quality: 'high'
        };
        
        // Mevcut dil
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'en';
        
        // RecordRTC kütüphanesini yükle
        this.loadRecordRTC();
        
        this.init();
    }

    // RecordRTC kütüphanesini dinamik olarak yükle
    async loadRecordRTC() {
        try {
            if (typeof RecordRTC === 'undefined') {
                console.log('RecordRTC yükleniyor...');
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/recordrtc@5.6.2/RecordRTC.min.js';
                script.async = true;
                
                const loadPromise = new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
                
                document.head.appendChild(script);
                await loadPromise;
                console.log('RecordRTC başarıyla yüklendi');
            }
        } catch (error) {
            console.error('RecordRTC yüklenemedi:', error);
        }
    }

    // Dil çeviri fonksiyonu
    t(key) {
        const translations = {
            en: {
                selectSourceFirst: "Please select a source first",
                recordingStarted: "Recording started",
                recordingStopped: "Recording stopped", 
                microphoneOn: "Microphone on",
                microphoneOff: "Microphone off",
                micAccessDenied: "Microphone access denied",
                sourceAdded: "Source added",
                previewError: "Preview could not be started",
                recordingError: "Recording error",
                noRecordingData: "No recording data found",
                previewCreateError: "Preview could not be created",
                noVideoToSave: "No video found to save",
                savingVideo: "Saving as MP4...",
                videoSaved: "Video saved successfully as MP4",
                saveError: "Video could not be saved",
                videoDeleted: "Recording deleted",
                userCancelled: "User cancelled saving",
                recording: "Recording",
                ready: "Ready",
                on: "On",
                off: "Off",
                gameMode: "Game Mode",
                gameModeEnabled: "Game Mode enabled",
                gameModeDisabled: "Game Mode disabled",
                microphoneSettings: "Microphone Settings",
                selectMicrophone: "Select Microphone",
                defaultMicrophone: "Default",
                microphoneGain: "Microphone Volume",
                noMicrophoneFound: "No microphone found",
                microphoneSelected: "Microphone selected",
                apply: "Apply",
                cancel: "Cancel"
            },
            tr: {
                selectSourceFirst: "Lütfen önce bir kaynak seçin",
                recordingStarted: "Kayıt başlatıldı",
                recordingStopped: "Kayıt durduruldu",
                microphoneOn: "Mikrofon açıldı",
                microphoneOff: "Mikrofon kapatıldı", 
                micAccessDenied: "Mikrofon erişimi reddedildi",
                sourceAdded: "Kaynak eklendi",
                previewError: "Önizleme başlatılamadı",
                recordingError: "Kayıt hatası",
                noRecordingData: "Kayıt verisi bulunamadı",
                previewCreateError: "Önizleme oluşturulamadı",
                noVideoToSave: "Kaydedilecek video bulunamadı",
                savingVideo: "MP4 Olarak Kaydediliyor...",
                videoSaved: "Video başarıyla MP4 olarak kaydedildi",
                saveError: "Video kaydedilemedi",
                videoDeleted: "Kayıt silindi",
                userCancelled: "Kullanıcı kaydetmeyi iptal etti",
                recording: "Kayıt Ediliyor",
                ready: "Hazır",
                on: "Açık",
                off: "Kapalı",
                gameMode: "Oyun Modu",
                gameModeEnabled: "Oyun Modu etkinleştirildi",
                gameModeDisabled: "Oyun Modu kapatıldı",
                microphoneSettings: "Mikrofon Ayarları",
                selectMicrophone: "Mikrofon Seç",
                defaultMicrophone: "Varsayılan",
                microphoneGain: "Mikrofon Ses Seviyesi",
                noMicrophoneFound: "Mikrofon bulunamadı",
                microphoneSelected: "Mikrofon seçildi",
                apply: "Uygula",
                cancel: "İptal"
            }
        };
        
        return translations[this.currentLanguage][key] || key;
    }

    async init() {
        await this.loadVersion();
        this.setupEventListeners();
        this.startClock();
        this.updateEstimatedSize();
        await this.loadMicrophoneDevices();
        this.addMicrophoneSettings();
        
        // Dil değişikliklerini dinle
        window.addEventListener('languageChanged', (e) => {
            this.currentLanguage = e.detail.language;
            this.updateDynamicTexts();
        });
        
        // Oyun modu kontrolü ekle
        this.addGameModeControl();
    }

    // Mikrofon cihazlarını yükle
    async loadMicrophoneDevices() {
        try {
            // Önce mikrofon iznini iste
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.microphoneDevices = devices.filter(device => device.kind === 'audioinput');
            
            // Varsayılan mikrofonu yükle
            const savedMicId = localStorage.getItem('selectedMicrophone');
            if (savedMicId) {
                this.selectedMicrophone = this.microphoneDevices.find(device => device.deviceId === savedMicId);
            }
            
            console.log('✅ Mikrofon cihazları yüklendi:', this.microphoneDevices.length);
        } catch (error) {
            console.error('❌ Mikrofon cihazları yüklenemedi:', error);
        }
    }

    // Audio mixer oluştur
    async createAudioMixer() {
        try {
            // Audio context oluştur
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000,
                latencyHint: 'interactive'
            });
            
            console.log('🎵 Audio Context oluşturuldu, sample rate:', this.audioContext.sampleRate);
            
            // Mixer node oluştur
            this.mixerNode = this.audioContext.createGain();
            this.mixerNode.gain.value = 1.0;
            
            // Output destination oluştur
            this.destination = this.audioContext.createMediaStreamDestination();
            
            // Mixer'ı destination'a bağla
            this.mixerNode.connect(this.destination);
            
            console.log('🎛️ Audio mixer oluşturuldu');
            return true;
        } catch (error) {
            console.error('❌ Audio mixer oluşturulamadı:', error);
            return false;
        }
    }

    // Sistem sesini mixer'a ekle
    addSystemAudioToMixer() {
        if (!this.screenStream || !this.audioContext || !this.mixerNode) {
            console.log('⚠️ Sistem sesi eklenemedi - gerekli bileşenler yok');
            return;
        }
        
        const systemAudioTracks = this.screenStream.getAudioTracks();
        if (systemAudioTracks.length === 0) {
            console.log('⚠️ Sistem ses track\'i bulunamadı');
            return;
        }
        
        try {
            // Sistem ses stream'ini mixer'a ekle
            const systemAudioStream = new MediaStream([systemAudioTracks[0]]);
            const systemSource = this.audioContext.createMediaStreamSource(systemAudioStream);
            
            this.systemGainNode = this.audioContext.createGain();
            this.systemGainNode.gain.value = 1.0; // Sistem sesi %100
            
            systemSource.connect(this.systemGainNode);
            this.systemGainNode.connect(this.mixerNode);
            
            console.log('✅ Sistem sesi mixer\'a eklendi');
        } catch (error) {
            console.error('❌ Sistem sesi eklenemedi:', error);
        }
    }

    // Mikrofon sesini mixer'a ekle
    addMicrophoneToMixer() {
        if (!this.microphoneStream || !this.audioContext || !this.mixerNode) {
            console.log('⚠️ Mikrofon eklenemedi - gerekli bileşenler yok');
            return;
        }
        
        const micAudioTracks = this.microphoneStream.getAudioTracks();
        if (micAudioTracks.length === 0) {
            console.log('⚠️ Mikrofon ses track\'i bulunamadı');
            return;
        }
        
        try {
            // Önceki mikrofon bağlantısını kaldır
            if (this.micGainNode) {
                this.micGainNode.disconnect();
                this.micGainNode = null;
            }
            
            // Mikrofon stream'ini mixer'a ekle
            const micAudioStream = new MediaStream([micAudioTracks[0]]);
            const micSource = this.audioContext.createMediaStreamSource(micAudioStream);
            
            this.micGainNode = this.audioContext.createGain();
            this.micGainNode.gain.value = this.microphoneGain; // Kullanıcının ayarladığı ses seviyesi
            
            micSource.connect(this.micGainNode);
            this.micGainNode.connect(this.mixerNode);
            
            console.log('✅ Mikrofon mixer\'a eklendi, gain:', this.microphoneGain);
        } catch (error) {
            console.error('❌ Mikrofon eklenemedi:', error);
        }
    }

    // Mikrofon ayarları modalını oluştur
createMicrophoneModal() {
    const modalHTML = `
        <div id="microphone-modal" class="modal">
            <div class="modal-content microphone-modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-microphone"></i> <span data-i18n="microphoneSettings">${this.t('microphoneSettings')}</span></h3>
                    <button id="close-mic-modal" class="close-modal-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mic-setting-group">
                        <label data-i18n="selectMicrophone">${this.t('selectMicrophone')}</label>
                        <select id="microphone-select" class="mic-select">
                            <option value="" data-i18n="defaultMicrophone">${this.t('defaultMicrophone')}</option>
                        </select>
                    </div>
                    
                    <div class="mic-setting-group">
                        <label data-i18n="microphoneGain">${this.t('microphoneGain')}</label>
                        <div class="gain-control">
                            <input type="range" id="mic-gain-slider" min="0" max="3" step="0.1" value="${this.microphoneGain}">
                            <span id="gain-value">${Math.round(this.microphoneGain * 100)}%</span>
                        </div>
                    </div>
                    
                    <div class="mic-test-section">
                        <div class="mic-level-indicator">
                            <div class="mic-level-bar" id="mic-level-bar"></div>
                        </div>
                        <button id="mic-test-btn" class="test-mic-btn">
                            <i class="fas fa-microphone-alt"></i> <span data-i18n="testMicrophone">Test Microphone</span>
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancel-mic-settings" class="cancel-btn" data-i18n="cancel">${this.t('cancel')}</button>
                    <button id="apply-mic-settings" class="apply-btn" data-i18n="apply">${this.t('apply')}</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.setupMicrophoneModalEvents();
}

// Dil çeviri fonksiyonu - testMicrophone eklendi
t(key) {
    const translations = {
        en: {
            selectSourceFirst: "Please select a source first",
            recordingStarted: "Recording started",
            recordingStopped: "Recording stopped", 
            microphoneOn: "Microphone on",
            microphoneOff: "Microphone off",
            micAccessDenied: "Microphone access denied",
            sourceAdded: "Source added",
            previewError: "Preview could not be started",
            recordingError: "Recording error",
            noRecordingData: "No recording data found",
            previewCreateError: "Preview could not be created",
            noVideoToSave: "No video found to save",
            savingVideo: "Saving as MP4...",
            videoSaved: "Video saved successfully as MP4",
            saveError: "Video could not be saved",
            videoDeleted: "Recording deleted",
            userCancelled: "User cancelled saving",
            recording: "Recording",
            ready: "Ready",
            on: "On",
            off: "Off",
            gameMode: "Game Mode",
            gameModeEnabled: "Game Mode enabled",
            gameModeDisabled: "Game Mode disabled",
            microphoneSettings: "Microphone Settings",
            selectMicrophone: "Select Microphone",
            defaultMicrophone: "Default",
            microphoneGain: "Microphone Volume",
            noMicrophoneFound: "No microphone found",
            microphoneSelected: "Microphone selected",
            apply: "Apply",
            cancel: "Cancel",
            testMicrophone: "Test Microphone",
            stopTest: "Stop Test"
        },
        tr: {
            selectSourceFirst: "Lütfen önce bir kaynak seçin",
            recordingStarted: "Kayıt başlatıldı",
            recordingStopped: "Kayıt durduruldu",
            microphoneOn: "Mikrofon açıldı",
            microphoneOff: "Mikrofon kapatıldı", 
            micAccessDenied: "Mikrofon erişimi reddedildi",
            sourceAdded: "Kaynak eklendi",
            previewError: "Önizleme başlatılamadı",
            recordingError: "Kayıt hatası",
            noRecordingData: "Kayıt verisi bulunamadı",
            previewCreateError: "Önizleme oluşturulamadı",
            noVideoToSave: "Kaydedilecek video bulunamadı",
            savingVideo: "MP4 Olarak Kaydediliyor...",
            videoSaved: "Video başarıyla MP4 olarak kaydedildi",
            saveError: "Video kaydedilemedi",
            videoDeleted: "Kayıt silindi",
            userCancelled: "Kullanıcı kaydetmeyi iptal etti",
            recording: "Kayıt Ediliyor",
            ready: "Hazır",
            on: "Açık",
            off: "Kapalı",
            gameMode: "Oyun Modu",
            gameModeEnabled: "Oyun Modu etkinleştirildi",
            gameModeDisabled: "Oyun Modu kapatıldı",
            microphoneSettings: "Mikrofon Ayarları",
            selectMicrophone: "Mikrofon Seç",
            defaultMicrophone: "Varsayılan",
            microphoneGain: "Mikrofon Ses Seviyesi",
            noMicrophoneFound: "Mikrofon bulunamadı",
            microphoneSelected: "Mikrofon seçildi",
            apply: "Uygula",
            cancel: "İptal",
            testMicrophone: "Mikrofonu Test Et",
            stopTest: "Testi Durdur"
        }
    };
    
    return translations[this.currentLanguage][key] || key;
}

// Dinamik metinleri güncelle - modal metinleri de dahil
updateDynamicTexts() {
    // Mikrofon durumu
    const micStatus = document.getElementById('mic-status');
    if (micStatus) {
        micStatus.textContent = this.micEnabled ? this.t('on') : this.t('off');
    }
    
    // Kayıt durumu
    const recordingStatus = document.getElementById('recording-status');
    if (recordingStatus && !this.isRecording) {
        recordingStatus.textContent = this.t('ready');
    }
    
    // Oyun modu butonu
    const gameModeBtn = document.getElementById('game-mode-btn');
    if (gameModeBtn) {
        const gameModeText = gameModeBtn.querySelector('span');
        if (gameModeText) {
            gameModeText.textContent = this.t('gameMode');
        }
    }
    
    // Mikrofon ayarları modalı metinleri
    const micModal = document.getElementById('microphone-modal');
    if (micModal) {
        // Modal başlığı
        const modalTitle = micModal.querySelector('[data-i18n="microphoneSettings"]');
        if (modalTitle) {
            modalTitle.textContent = this.t('microphoneSettings');
        }
        
        // Label'ları güncelle
        const selectMicLabel = micModal.querySelector('[data-i18n="selectMicrophone"]');
        if (selectMicLabel) {
            selectMicLabel.textContent = this.t('selectMicrophone');
        }
        
        const micGainLabel = micModal.querySelector('[data-i18n="microphoneGain"]');
        if (micGainLabel) {
            micGainLabel.textContent = this.t('microphoneGain');
        }
        
        // Butonları güncelle
        const cancelBtn = micModal.querySelector('[data-i18n="cancel"]');
        if (cancelBtn) {
            cancelBtn.textContent = this.t('cancel');
        }
        
        const applyBtn = micModal.querySelector('[data-i18n="apply"]');
        if (applyBtn) {
            applyBtn.textContent = this.t('apply');
        }
        
        const testBtn = micModal.querySelector('[data-i18n="testMicrophone"]');
        if (testBtn) {
            testBtn.textContent = this.t('testMicrophone');
        }
        
        // Default mikrofon seçeneğini güncelle
        const defaultOption = micModal.querySelector('[data-i18n="defaultMicrophone"]');
        if (defaultOption) {
            defaultOption.textContent = this.t('defaultMicrophone');
        }
        
        // "No microphone found" seçeneğini güncelle
        const noMicOption = micModal.querySelector('option[disabled]');
        if (noMicOption && noMicOption.textContent.includes('microphone') || noMicOption && noMicOption.textContent.includes('mikrofon')) {
            noMicOption.textContent = this.t('noMicrophoneFound');
        }
    }
}

// Mikrofon select'ini doldur - çeviri destekli
populateMicrophoneSelect() {
    const micSelect = document.getElementById('microphone-select');
    micSelect.innerHTML = `<option value="" data-i18n="defaultMicrophone">${this.t('defaultMicrophone')}</option>`;

    if (this.microphoneDevices.length === 0) {
        const option = document.createElement('option');
        option.textContent = this.t('noMicrophoneFound');
        option.disabled = true;
        micSelect.appendChild(option);
        return;
    }

    this.microphoneDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${device.deviceId.slice(0, 8)}`;
        
        if (this.selectedMicrophone && this.selectedMicrophone.deviceId === device.deviceId) {
            option.selected = true;
        }
        
        micSelect.appendChild(option);
    });
}

// Mikrofon test - dil destekli buton metni
async testMicrophone() {
    const micTestBtn = document.getElementById('mic-test-btn');
    const micLevelBar = document.getElementById('mic-level-bar');

    if (this.testStream) {
        this.stopMicrophoneTest();
        return;
    }

    try {
        const constraints = {
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1,
                sampleRate: 48000
            }
        };

        if (this.selectedMicrophone) {
            constraints.audio.deviceId = { exact: this.selectedMicrophone.deviceId };
        }

        this.testStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        this.testAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.testAudioContext.createMediaStreamSource(this.testStream);
        const analyser = this.testAudioContext.createAnalyser();
        const gainNode = this.testAudioContext.createGain();
        
        gainNode.gain.value = this.microphoneGain;
        analyser.fftSize = 1024;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        source.connect(gainNode);
        gainNode.connect(analyser);

        // Buton metnini güncelle
        micTestBtn.innerHTML = `<i class="fas fa-stop"></i> <span data-i18n="stopTest">${this.t('stopTest')}</span>`;
        micTestBtn.classList.add('testing');

        const updateLevel = () => {
            if (!this.testStream || !this.testStream.active) return;
            
            analyser.getByteTimeDomainData(dataArray);
            let max = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const sample = Math.abs(dataArray[i] - 128) / 128;
                if (sample > max) max = sample;
            }
            
            const level = Math.min(100, max * 100 * this.microphoneGain);
            micLevelBar.style.width = level + '%';
            
            if (level > 80) {
                micLevelBar.style.backgroundColor = '#ed4245';
            } else if (level > 50) {
                micLevelBar.style.backgroundColor = '#faa61a';
            } else {
                micLevelBar.style.backgroundColor = '#57f287';
            }
            
            if (this.testStream && this.testStream.active) {
                requestAnimationFrame(updateLevel);
            }
        };
        
        updateLevel();

    } catch (error) {
        console.error('❌ Mikrofon test hatası:', error);
        this.showNotification(this.t('micAccessDenied'), 'error');
        this.stopMicrophoneTest();
    }
}

// Mikrofon testini durdur - dil destekli buton metni
stopMicrophoneTest() {
    const micTestBtn = document.getElementById('mic-test-btn');
    const micLevelBar = document.getElementById('mic-level-bar');

    if (this.testStream) {
        this.testStream.getTracks().forEach(track => track.stop());
        this.testStream = null;
    }

    if (this.testAudioContext) {
        this.testAudioContext.close();
        this.testAudioContext = null;
    }

    if (micTestBtn) {
        micTestBtn.innerHTML = `<i class="fas fa-microphone-alt"></i> <span data-i18n="testMicrophone">${this.t('testMicrophone')}</span>`;
        micTestBtn.classList.remove('testing');
    }

    if (micLevelBar) {
        micLevelBar.style.width = '0%';
    }
}

// Mikrofon ayarlarını aç - dil kontrolü ile
async openMicrophoneSettings() {
    await this.loadMicrophoneDevices();
    this.populateMicrophoneSelect();
    
    const micGainSlider = document.getElementById('mic-gain-slider');
    const gainValue = document.getElementById('gain-value');
    
    micGainSlider.value = this.microphoneGain;
    gainValue.textContent = Math.round(this.microphoneGain * 100) + '%';

    document.getElementById('microphone-modal').classList.add('active');
    
    // Modal açıldığında dil metinlerini güncelle
    this.updateDynamicTexts();
}
    // Mikrofon sesini mixer'dan kaldır
    removeMicrophoneFromMixer() {
        if (this.micGainNode) {
            try {
                this.micGainNode.disconnect();
                this.micGainNode = null;
                console.log('✅ Mikrofon mixer\'dan kaldırıldı');
            } catch (error) {
                console.error('❌ Mikrofon kaldırılamadı:', error);
            }
        }
    }

    // Final stream oluştur
    createFinalStream() {
        if (!this.screenStream) {
            console.log('❌ Ekran stream\'i yok');
            return null;
        }
        
        const videoTrack = this.screenStream.getVideoTracks()[0];
        if (!videoTrack) {
            console.log('❌ Video track bulunamadı');
            return null;
        }
        
        const tracks = [videoTrack];
        
        // Audio mixer'dan ses track'ini al
        if (this.destination && this.destination.stream) {
            const audioTrack = this.destination.stream.getAudioTracks()[0];
            if (audioTrack) {
                tracks.push(audioTrack);
                console.log('✅ Mixed audio track eklendi');
            } else {
                console.log('⚠️ Mixed audio track bulunamadı');
            }
        }
        
        const finalStream = new MediaStream(tracks);
        console.log('🎬 Final stream oluşturuldu - Video tracks:', finalStream.getVideoTracks().length, 'Audio tracks:', finalStream.getAudioTracks().length);
        
        return finalStream;
    }

    // Mikrofon ayarları arayüzü ekle
    addMicrophoneSettings() {
        const micControlGroup = document.querySelector('.mic-control-group');
        if (!micControlGroup) return;

        const micSettingsBtn = document.createElement('button');
        micSettingsBtn.id = 'mic-settings-btn';
        micSettingsBtn.className = 'mic-settings-btn';
        micSettingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
        micSettingsBtn.title = this.t('microphoneSettings');
        
        micControlGroup.appendChild(micSettingsBtn);
        this.createMicrophoneModal();
        micSettingsBtn.addEventListener('click', () => this.openMicrophoneSettings());
    }

    // Mikrofon ayarları modalını oluştur
    createMicrophoneModal() {
        const modalHTML = `
            <div id="microphone-modal" class="modal">
                <div class="modal-content microphone-modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-microphone"></i> ${this.t('microphoneSettings')}</h3>
                        <button id="close-mic-modal" class="close-modal-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="mic-setting-group">
                            <label>${this.t('selectMicrophone')}</label>
                            <select id="microphone-select" class="mic-select">
                                <option value="">${this.t('defaultMicrophone')}</option>
                            </select>
                        </div>
                        
                        <div class="mic-setting-group">
                            <label>${this.t('microphoneGain')}</label>
                            <div class="gain-control">
                                <input type="range" id="mic-gain-slider" min="0" max="3" step="0.1" value="${this.microphoneGain}">
                                <span id="gain-value">${Math.round(this.microphoneGain * 100)}%</span>
                            </div>
                        </div>
                        
                        <div class="mic-test-section">
                            <div class="mic-level-indicator">
                                <div class="mic-level-bar" id="mic-level-bar"></div>
                            </div>
                            <button id="mic-test-btn" class="test-mic-btn">
                                <i class="fas fa-microphone-alt"></i> Test Microphone
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-mic-settings" class="cancel-btn">${this.t('cancel')}</button>
                        <button id="apply-mic-settings" class="apply-btn">${this.t('apply')}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupMicrophoneModalEvents();
    }

    // Mikrofon modal event'lerini ayarla
    setupMicrophoneModalEvents() {
        const micModal = document.getElementById('microphone-modal');
        const closeMicModal = document.getElementById('close-mic-modal');
        const cancelMicSettings = document.getElementById('cancel-mic-settings');
        const applyMicSettings = document.getElementById('apply-mic-settings');
        const micGainSlider = document.getElementById('mic-gain-slider');
        const gainValue = document.getElementById('gain-value');
        const micTestBtn = document.getElementById('mic-test-btn');

        closeMicModal.addEventListener('click', () => this.closeMicrophoneSettings());
        cancelMicSettings.addEventListener('click', () => this.closeMicrophoneSettings());
        
        micModal.addEventListener('click', (e) => {
            if (e.target.id === 'microphone-modal') this.closeMicrophoneSettings();
        });

        applyMicSettings.addEventListener('click', () => this.applyMicrophoneSettings());

        micGainSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.microphoneGain = value;
            gainValue.textContent = Math.round(value * 100) + '%';
            
            // Canlı olarak gain'i uygula
            if (this.micGainNode) {
                this.micGainNode.gain.value = value;
            }
        });

        micTestBtn.addEventListener('click', () => this.testMicrophone());
    }

    async openMicrophoneSettings() {
        await this.loadMicrophoneDevices();
        this.populateMicrophoneSelect();
        
        const micGainSlider = document.getElementById('mic-gain-slider');
        const gainValue = document.getElementById('gain-value');
        
        micGainSlider.value = this.microphoneGain;
        gainValue.textContent = Math.round(this.microphoneGain * 100) + '%';

        document.getElementById('microphone-modal').classList.add('active');
    }

    populateMicrophoneSelect() {
        const micSelect = document.getElementById('microphone-select');
        micSelect.innerHTML = `<option value="">${this.t('defaultMicrophone')}</option>`;

        if (this.microphoneDevices.length === 0) {
            const option = document.createElement('option');
            option.textContent = this.t('noMicrophoneFound');
            option.disabled = true;
            micSelect.appendChild(option);
            return;
        }

        this.microphoneDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${device.deviceId.slice(0, 8)}`;
            
            if (this.selectedMicrophone && this.selectedMicrophone.deviceId === device.deviceId) {
                option.selected = true;
            }
            
            micSelect.appendChild(option);
        });
    }

    closeMicrophoneSettings() {
        document.getElementById('microphone-modal').classList.remove('active');
        this.stopMicrophoneTest();
    }

    async applyMicrophoneSettings() {
        const micSelect = document.getElementById('microphone-select');
        const selectedDeviceId = micSelect.value;

        if (selectedDeviceId) {
            this.selectedMicrophone = this.microphoneDevices.find(device => device.deviceId === selectedDeviceId);
            localStorage.setItem('selectedMicrophone', selectedDeviceId);
        } else {
            this.selectedMicrophone = null;
            localStorage.removeItem('selectedMicrophone');
        }

        localStorage.setItem('microphoneGain', this.microphoneGain.toString());

        if (this.micEnabled) {
            await this.restartMicrophone();
        }

        this.closeMicrophoneSettings();
        this.showNotification(this.t('microphoneSelected'));
    }

    async testMicrophone() {
        const micTestBtn = document.getElementById('mic-test-btn');
        const micLevelBar = document.getElementById('mic-level-bar');

        if (this.testStream) {
            this.stopMicrophoneTest();
            return;
        }

        try {
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 48000
                }
            };

            if (this.selectedMicrophone) {
                constraints.audio.deviceId = { exact: this.selectedMicrophone.deviceId };
            }

            this.testStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.testAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.testAudioContext.createMediaStreamSource(this.testStream);
            const analyser = this.testAudioContext.createAnalyser();
            const gainNode = this.testAudioContext.createGain();
            
            gainNode.gain.value = this.microphoneGain;
            analyser.fftSize = 1024;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            source.connect(gainNode);
            gainNode.connect(analyser);

            micTestBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Test';
            micTestBtn.classList.add('testing');

            const updateLevel = () => {
                if (!this.testStream || !this.testStream.active) return;
                
                analyser.getByteTimeDomainData(dataArray);
                let max = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const sample = Math.abs(dataArray[i] - 128) / 128;
                    if (sample > max) max = sample;
                }
                
                const level = Math.min(100, max * 100 * this.microphoneGain);
                micLevelBar.style.width = level + '%';
                
                if (level > 80) {
                    micLevelBar.style.backgroundColor = '#ed4245';
                } else if (level > 50) {
                    micLevelBar.style.backgroundColor = '#faa61a';
                } else {
                    micLevelBar.style.backgroundColor = '#57f287';
                }
                
                if (this.testStream && this.testStream.active) {
                    requestAnimationFrame(updateLevel);
                }
            };
            
            updateLevel();

        } catch (error) {
            console.error('❌ Mikrofon test hatası:', error);
            this.showNotification(this.t('micAccessDenied'), 'error');
            this.stopMicrophoneTest();
        }
    }

    stopMicrophoneTest() {
        const micTestBtn = document.getElementById('mic-test-btn');
        const micLevelBar = document.getElementById('mic-level-bar');

        if (this.testStream) {
            this.testStream.getTracks().forEach(track => track.stop());
            this.testStream = null;
        }

        if (this.testAudioContext) {
            this.testAudioContext.close();
            this.testAudioContext = null;
        }

        if (micTestBtn) {
            micTestBtn.innerHTML = '<i class="fas fa-microphone-alt"></i> Test Microphone';
            micTestBtn.classList.remove('testing');
        }

        if (micLevelBar) {
            micLevelBar.style.width = '0%';
        }
    }

    async restartMicrophone() {
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }

        try {
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 48000
                }
            };

            if (this.selectedMicrophone) {
                constraints.audio.deviceId = { exact: this.selectedMicrophone.deviceId };
            }

            this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('🎤 Mikrofon yeniden başlatıldı');

            // Eğer kayıt sırasındaysa mikrofonu mixer'a ekle
            if (this.isRecording && this.audioContext) {
                this.addMicrophoneToMixer();
            }

        } catch (error) {
            console.error('❌ Mikrofon yeniden başlatılamadı:', error);
            this.showNotification(this.t('micAccessDenied'), 'error');
        }
    }

    // Oyun modu kontrolü ekle
    addGameModeControl() {
        const controlSection = document.querySelector('.control-section');
        if (!controlSection) return;
        
        const gameModeBtn = document.createElement('button');
        gameModeBtn.id = 'game-mode-btn';
        gameModeBtn.className = 'control-btn';
        gameModeBtn.innerHTML = `
            <i class="fas fa-gamepad"></i>
            <span data-i18n="gameMode">${this.t('gameMode')}</span>
        `;
        
        gameModeBtn.addEventListener('click', () => this.toggleGameMode());
        this.gameMode = false;
        controlSection.appendChild(gameModeBtn);
    }
    
    toggleGameMode() {
        this.gameMode = !this.gameMode;
        
        const gameModeBtn = document.getElementById('game-mode-btn');
        if (gameModeBtn) {
            if (this.gameMode) {
                gameModeBtn.classList.add('active');
                this.showNotification(this.t('gameModeEnabled'));
            } else {
                gameModeBtn.classList.remove('active');
                this.showNotification(this.t('gameModeDisabled'));
            }
        }
        
        if (this.gameMode) {
            this.videoSettings.quality = 'high';
            const qualitySelect = document.getElementById('quality-select');
            if (qualitySelect) qualitySelect.value = 'high';
            
            if (this.previewStream) {
                this.previewStream.getTracks().forEach(track => track.stop());
                this.previewStream = null;
                const previewCanvas = document.getElementById('preview-canvas');
                if (previewCanvas) previewCanvas.style.display = 'none';
            }
        } else {
            if (this.selectedSource && !this.isRecording) {
                this.setupPreview();
            }
        }
        
        this.updateEstimatedSize();
    }

    updateDynamicTexts() {
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            micStatus.textContent = this.micEnabled ? this.t('on') : this.t('off');
        }
        
        const recordingStatus = document.getElementById('recording-status');
        if (recordingStatus && !this.isRecording) {
            recordingStatus.textContent = this.t('ready');
        }
        
        const gameModeBtn = document.getElementById('game-mode-btn');
        if (gameModeBtn) {
            const gameModeText = gameModeBtn.querySelector('span');
            if (gameModeText) {
                gameModeText.textContent = this.t('gameMode');
            }
        }
    }

    async loadVersion() {
        try {
            const version = await window.electronAPI.getAppVersion();
            document.getElementById('version-info').textContent = `v${version}`;
        } catch (error) {
            console.error('Versiyon alınamadı:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('add-source-btn').addEventListener('click', () => this.openSourceModal());
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-source').addEventListener('click', () => this.closeModal());
        document.getElementById('confirm-source').addEventListener('click', () => this.confirmSource());
        
        document.getElementById('start-recording-btn').addEventListener('click', () => this.startRecording());
        document.getElementById('stop-recording-btn').addEventListener('click', () => this.stopRecording());
        
        document.getElementById('mic-toggle-btn').addEventListener('click', () => this.toggleMicrophone());
        
        document.getElementById('resolution-select').addEventListener('change', (e) => this.updateResolution(e.target.value));
        document.getElementById('fps-select').addEventListener('change', (e) => this.updateFPS(e.target.value));
        document.getElementById('quality-select').addEventListener('change', (e) => this.updateQuality(e.target.value));
        
        document.getElementById('save-recording').addEventListener('click', () => this.saveRecording());
        document.getElementById('discard-recording').addEventListener('click', () => this.discardRecording());
        
        document.getElementById('close-save-modal').addEventListener('click', () => this.closeSaveModal());
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('source-modal').addEventListener('click', (e) => {
            if (e.target.id === 'source-modal') this.closeModal();
        });
        document.getElementById('save-modal').addEventListener('click', (e) => {
            if (e.target.id === 'save-modal') this.closeSaveModal();
        });

        window.addEventListener('beforeunload', () => {
            this.cleanupAllStreams();
        });
        
        if (typeof requestAnimationFrame !== 'undefined') {
            this.monitorPerformance();
        }
    }
    
    monitorPerformance() {
        let lastFrameTime = performance.now();
        let frameCount = 0;
        let currentFPS = 60;
        
        const checkPerformance = () => {
            const now = performance.now();
            frameCount++;
            
            if (now - lastFrameTime >= 1000) {
                currentFPS = frameCount;
                frameCount = 0;
                lastFrameTime = now;
                
                const fpsDisplay = document.getElementById('fps-display');
                if (fpsDisplay) {
                    fpsDisplay.textContent = `${currentFPS}`;
                }
            }
            
            requestAnimationFrame(checkPerformance);
        };
        
        requestAnimationFrame(checkPerformance);
    }

    updateResolution(resolution) {
        this.videoSettings.resolution = resolution;
        const currentResolution = document.getElementById('current-resolution');
        if (currentResolution) currentResolution.textContent = resolution;
        
        const previewResolutionDisplay = document.getElementById('preview-resolution-display');
        if (previewResolutionDisplay) {
            previewResolutionDisplay.textContent = `${resolution} • ${this.videoSettings.fps} FPS`;
        }
        
        this.updateEstimatedSize();
        
        if (this.selectedSource && !this.gameMode) {
            this.setupPreview();
        }
    }

    updateFPS(fps) {
        this.videoSettings.fps = parseInt(fps);
        const currentFps = document.getElementById('current-fps');
        if (currentFps) currentFps.textContent = `${fps} FPS`;
        
        const previewResolutionDisplay = document.getElementById('preview-resolution-display');
        if (previewResolutionDisplay) {
            previewResolutionDisplay.textContent = `${this.videoSettings.resolution} • ${fps} FPS`;
        }
        
        this.updateEstimatedSize();
        
        if (this.selectedSource && !this.gameMode) {
            this.setupPreview();
        }
    }

    updateQuality(quality) {
        this.videoSettings.quality = quality;
        this.updateEstimatedSize();
    }

    updateEstimatedSize() {
        const [width, height] = this.videoSettings.resolution.split('x').map(Number);
        const fps = this.videoSettings.fps;
        const quality = this.videoSettings.quality;
        
        let baseSize = (width * height * fps) / 1000000;
        
        const qualityMultiplier = {
            'high': 1.5,
            'medium': 1.0,
            'low': 0.6
        };
        
        const estimatedSize = Math.round(baseSize * qualityMultiplier[quality] * 0.5);
        const sizeText = this.currentLanguage === 'tr' ? `~${estimatedSize} MB/dakika` : `~${estimatedSize} MB/minute`;
        const estimatedSizeElement = document.getElementById('estimated-size');
        if (estimatedSizeElement) estimatedSizeElement.textContent = sizeText;
    }

    getVideoConstraints() {
        const [width, height] = this.videoSettings.resolution.split('x').map(Number);
        
        return {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: this.selectedSource.id,
                minWidth: width,
                maxWidth: width,
                minHeight: height,
                maxHeight: height,
                minFrameRate: this.videoSettings.fps,
                maxFrameRate: this.videoSettings.fps
            }
        };
    }

    getRecordRTCOptions() {
        const [width, height] = this.videoSettings.resolution.split('x').map(Number);
        
        const bitrateSettings = {
            'high': 12000000,
            'medium': 6000000,
            'low': 3000000
        };
        
        return {
            type: 'video',
            mimeType: 'video/webm;codecs=h264,opus',
            frameRate: this.videoSettings.fps,
            quality: 100,
            videoBitsPerSecond: bitrateSettings[this.videoSettings.quality],
            videoWidth: width,
            videoHeight: height,
            disableLogs: false, // Debug için açık
            timeSlice: 1000,
            recorderType: RecordRTC.MediaStreamRecorder,
            getNativeBlob: true,
            checkForInactiveTracks: false,
            bitsPerSecond: 128000
        };
    }

    getMediaRecorderOptions() {
        const options = { mimeType: 'video/webm' };
        
        const bitrateSettings = {
            'high': 8000000,
            'medium': 4000000,
            'low': 2000000
        };
        
        if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
            options.mimeType = 'video/webm;codecs=h264,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            options.mimeType = 'video/webm;codecs=vp9,opus';
        }
        
        options.videoBitsPerSecond = bitrateSettings[this.videoSettings.quality];
        
        return options;
    }

    cleanupAllStreams() {
        console.log('🧹 Tüm stream\'ler temizleniyor...');
        
        if (this.previewStream) {
            this.previewStream.getTracks().forEach(track => track.stop());
            this.previewStream = null;
        }

        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }

        if (this.combinedStream) {
            this.combinedStream.getTracks().forEach(track => track.stop());
            this.combinedStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.recordRTC) {
            this.recordRTC.destroy();
            this.recordRTC = null;
        }

        this.stopMicrophoneTest();

        this.micGainNode = null;
        this.systemGainNode = null;
        this.mixerNode = null;
        this.destination = null;
    }

    async openSourceModal() {
        document.getElementById('source-modal').classList.add('active');
        await this.loadSources('screen');
    }

    closeModal() {
        document.getElementById('source-modal').classList.remove('active');
        document.querySelectorAll('.source-grid-item').forEach(item => {
            item.classList.remove('selected');
        });
        const confirmSource = document.getElementById('confirm-source');
        if (confirmSource) confirmSource.disabled = true;
    }

    closeSaveModal() {
        const previewVideo = document.getElementById('save-preview-video');
        if (previewVideo) {
            previewVideo.pause();
            previewVideo.src = '';
            previewVideo.load();
        }
        
        document.getElementById('save-modal').classList.remove('active');
    }

    async loadSources(type = 'screen') {
        try {
            const sources = await window.electronAPI.getSources();
            const filteredSources = sources.filter(source => {
                return type === 'screen' ? source.id.startsWith('screen:') : source.id.startsWith('window:');
            });
            
            filteredSources.forEach(source => {
                if (this.currentLanguage === 'en') {
                    if (source.name === "Tam Ekran" || source.name === "Tam ekran" || 
                        source.name === "Tüm Ekran" || source.name === "Tüm ekran") {
                        source.name = "Full Screen";
                    }
                } else if (this.currentLanguage === 'tr') {
                    if (source.name === "Full Screen" || source.name === "Entire Screen") {
                        source.name = "Tam Ekran";
                    }
                }
            });
            
            this.displaySources(filteredSources);
        } catch (error) {
            console.error('Kaynaklar yüklenemedi:', error);
            this.showNotification('Kaynaklar yüklenirken hata oluştu', 'error');
        }
    }

    displaySources(sources) {
        const sourcesGrid = document.getElementById('sources-grid');
        sourcesGrid.innerHTML = '';

        if (sources.length === 0) {
            const noSourceText = this.currentLanguage === 'tr' ? 'Kaynak bulunamadı' : 'No source found';
            sourcesGrid.innerHTML = `<p style="text-align: center; color: #b9bbbe;">${noSourceText}</p>`;
            return;
        }

        sources.forEach(source => {
            const sourceElement = document.createElement('div');
            sourceElement.className = 'source-grid-item';
            sourceElement.innerHTML = `
                <img src="${source.thumbnail.toDataURL()}" alt="${source.name}">
                <div class="source-name">${source.name}</div>
            `;
            sourceElement.addEventListener('click', () => this.selectSourceInModal(source, sourceElement));
            sourcesGrid.appendChild(sourceElement);
        });
    }

    selectSourceInModal(source, element) {
        document.querySelectorAll('.source-grid-item').forEach(item => {
            item.classList.remove('selected');
        });
        element.classList.add('selected');
        this.selectedSource = source;
        const confirmSource = document.getElementById('confirm-source');
        if (confirmSource) confirmSource.disabled = false;
    }

    async confirmSource() {
        if (this.selectedSource) {
            this.addSourceToList(this.selectedSource);
            if (!this.gameMode) {
                await this.setupPreview();
            }
            this.closeModal();
            this.showNotification(this.t('sourceAdded'));
        }
    }

    addSourceToList(source) {
        const sourcesList = document.getElementById('sources-list');
        sourcesList.innerHTML = `
            <div class="source-item active">
                <img src="${source.thumbnail.toDataURL()}" alt="${source.name}">
                <div class="source-info">
                    <div class="source-name">${source.name}</div>
                </div>
            </div>
        `;
        const previewPlaceholder = document.getElementById('preview-placeholder');
        if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    }

    async setupPreview() {
        try {
            if (this.gameMode) {
                const previewCanvas = document.getElementById('preview-canvas');
                if (previewCanvas) previewCanvas.style.display = 'none';
                return;
            }
            
            if (this.previewStream) {
                this.previewStream.getTracks().forEach(track => track.stop());
            }

            this.previewStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: this.getVideoConstraints()
            });

            const canvas = document.getElementById('preview-canvas');
            const video = document.createElement('video');
            video.srcObject = this.previewStream;
            video.autoplay = true;
            video.muted = true;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.style.display = 'block';
                
                const ctx = canvas.getContext('2d');
                const drawFrame = () => {
                    if (this.previewStream && this.previewStream.active) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        requestAnimationFrame(drawFrame);
                    }
                };
                drawFrame();
            };

        } catch (error) {
            console.error('Önizleme başlatılamadı:', error);
            this.showNotification(this.t('previewError'), 'error');
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        this.loadSources(tab);
    }

    async toggleMicrophone() {
        const micBtn = document.getElementById('mic-toggle-btn');
        const micIcon = micBtn.querySelector('i');
        const micText = micBtn.querySelector('span');
        const micStatus = document.getElementById('mic-status');
        
        if (!this.micEnabled) {
            try {
                console.log('🎤 Mikrofon açılıyor...');
                
                const constraints = {
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        channelCount: 1,
                        sampleRate: 48000
                    }
                };

                if (this.selectedMicrophone) {
                    constraints.audio.deviceId = { exact: this.selectedMicrophone.deviceId };
                    console.log('🎯 Seçili mikrofon kullanılıyor:', this.selectedMicrophone.label);
                }

                this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                micIcon.className = 'fas fa-microphone';
                micText.setAttribute('data-i18n', 'micOn');
                micText.textContent = this.t('micOn');
                micStatus.textContent = this.t('on');
                micStatus.className = 'mic-status active';
                this.micEnabled = true;
                
                console.log('✅ Mikrofon açıldı, tracks:', this.microphoneStream.getAudioTracks().length);
                
                // Eğer kayıt sırasındaysa mikrofonu mixer'a ekle
                if (this.isRecording && this.audioContext) {
                    this.addMicrophoneToMixer();
                }
                
                this.showNotification(this.t('microphoneOn'));
                
            } catch (error) {
                console.error('❌ Mikrofon erişimi reddedildi:', error);
                this.showNotification(this.t('micAccessDenied'), 'error');
            }
        } else {
            console.log('🎤 Mikrofon kapatılıyor...');
            
            // Mikrofonu mixer'dan kaldır
            if (this.isRecording) {
                this.removeMicrophoneFromMixer();
            } else {
                if (this.microphoneStream) {
                    this.microphoneStream.getTracks().forEach(track => track.stop());
                    this.microphoneStream = null;
                }
            }
            
            micIcon.className = 'fas fa-microphone-slash';
            micText.setAttribute('data-i18n', 'micOff');
            micText.textContent = this.t('micOff');
            micStatus.textContent = this.t('off');
            micStatus.className = 'mic-status';
            this.micEnabled = false;
            
            console.log('✅ Mikrofon kapatıldı');
            this.showNotification(this.t('microphoneOff'));
        }
    }

    async startRecording() {
        if (!this.selectedSource) {
            this.showNotification(this.t('selectSourceFirst'), 'warning');
            return;
        }

        try {
            console.log('🎬 Kayıt başlatılıyor...', this.videoSettings);
            
            // Ekran stream'ini al
            this.screenStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop'
                    }
                },
                video: this.getVideoConstraints()
            });

            console.log('📺 Ekran stream\'i alındı - Video tracks:', this.screenStream.getVideoTracks().length, 'Audio tracks:', this.screenStream.getAudioTracks().length);
            
            // Audio mixer oluştur
            const mixerCreated = await this.createAudioMixer();
            if (!mixerCreated) {
                throw new Error('Audio mixer oluşturulamadı');
            }
            
            // Sistem sesini mixer'a ekle
            this.addSystemAudioToMixer();
            
            // Mikrofon açıksa onu da mixer'a ekle
            if (this.micEnabled && this.microphoneStream) {
                this.addMicrophoneToMixer();
            }
            
            // Final stream oluştur
            this.combinedStream = this.createFinalStream();
            if (!this.combinedStream) {
                throw new Error('Final stream oluşturulamadı');
            }
            
            console.log('🎵 Final stream oluşturuldu - Video tracks:', this.combinedStream.getVideoTracks().length, 'Audio tracks:', this.combinedStream.getAudioTracks().length);
            
            // RecordRTC ile kaydet
            if (typeof RecordRTC !== 'undefined') {
                await this.startRecordingWithRecordRTC();
            } else {
                await this.startRecordingWithMediaRecorder();
            }
            
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.updateRecordingUI();
            this.startTimer();
            
            if (this.gameMode && this.previewStream) {
                this.previewStream.getTracks().forEach(track => track.stop());
                this.previewStream = null;
                const previewCanvas = document.getElementById('preview-canvas');
                if (previewCanvas) previewCanvas.style.display = 'none';
            }
            
            const qualityText = this.currentLanguage === 'tr' ? 
                this.videoSettings.quality.toUpperCase().replace('HIGH', 'YÜKSEK').replace('MEDIUM', 'ORTA').replace('LOW', 'DÜŞÜK') :
                this.videoSettings.quality.toUpperCase();
            
            const settingsText = `${this.videoSettings.resolution} • ${this.videoSettings.fps} FPS • ${qualityText}`;
            const modeText = this.gameMode ? ` (${this.t('gameMode')})` : '';
            const micText = this.micEnabled ? ' 🎤' : '';
            this.showNotification(`${this.t('recordingStarted')} (${settingsText})${modeText}${micText}`);

        } catch (error) {
            console.error('❌ Kayıt başlatılamadı:', error);
            this.showNotification(this.t('recordingError') + ': ' + error.message, 'error');
        }
    }
    
    async startRecordingWithRecordRTC() {
        console.log('🎥 RecordRTC ile kayıt başlatılıyor...');
        
        this.recordedChunks = [];
        const options = this.getRecordRTCOptions();
        
        this.recordRTC = new RecordRTC(this.combinedStream, options);
        this.recordRTC.startRecording();
        
        console.log('✅ RecordRTC başlatıldı');
    }
    
    async startRecordingWithMediaRecorder() {
        console.log('🎥 MediaRecorder ile kayıt başlatılıyor...');
        
        this.recordedChunks = [];
        const options = this.getMediaRecorderOptions();
        this.mediaRecorder = new MediaRecorder(this.combinedStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
                this.updateFileSize();
            }
        };

        this.mediaRecorder.onstop = () => {
            console.log('🎬 MediaRecorder durduruldu. Chunks:', this.recordedChunks.length);
            this.cleanupRecordingStreams();
            
            if (this.recordedChunks.length > 0) {
                this.showSaveModal();
            } else {
                this.showNotification(this.t('noRecordingData'), 'error');
            }
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('❌ MediaRecorder error:', event.error);
            this.showNotification(this.t('recordingError') + ': ' + event.error.message, 'error');
        };

        this.mediaRecorder.start(1000);
        console.log('✅ MediaRecorder başlatıldı');
    }

    cleanupRecordingStreams() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        if (this.combinedStream) {
            this.combinedStream.getTracks().forEach(track => track.stop());
            this.combinedStream = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.micGainNode = null;
        this.systemGainNode = null;
        this.mixerNode = null;
        this.destination = null;
        
        if (!this.micEnabled && this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
    }

    stopRecording() {
        console.log('⏹️ Kayıt durduruluyor...');
        
        if (this.recordRTC && this.isRecording) {
            this.recordRTC.stopRecording(() => {
                console.log('🎬 RecordRTC kaydı durduruldu');
                
                const blob = this.recordRTC.getBlob();
                if (blob.size > 0) {
                    this.recordedChunks.push(blob);
                }
                
                this.cleanupRecordingStreams();
                this.recordRTC = null;
                
                this.isRecording = false;
                this.stopTimer();
                this.updateRecordingUI();
                
                if (this.recordedChunks.length > 0) {
                    this.showSaveModal();
                } else {
                    this.showNotification(this.t('noRecordingData'), 'error');
                }
                
                this.showNotification(this.t('recordingStopped'));
            });
        } else if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            this.updateRecordingUI();
            this.showNotification(this.t('recordingStopped'));
        }
    }

    updateRecordingUI() {
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const recordingIndicator = document.getElementById('recording-indicator');
        const recordingStatus = document.getElementById('recording-status');
        const gameModeBtn = document.getElementById('game-mode-btn');
        const micSettingsBtn = document.getElementById('mic-settings-btn');

        if (this.isRecording) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            recordingIndicator.classList.add('active');
            recordingStatus.textContent = this.t('recording');
            recordingStatus.style.color = '#ed4245';
            
            if (gameModeBtn) gameModeBtn.disabled = true;
            if (micSettingsBtn) micSettingsBtn.disabled = true;
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            recordingIndicator.classList.remove('active');
            recordingStatus.textContent = this.t('ready');
            recordingStatus.style.color = '#ff8c00';
            
            if (gameModeBtn) gameModeBtn.disabled = false;
            if (micSettingsBtn) micSettingsBtn.disabled = false;
            
            if (!this.gameMode && this.selectedSource) {
                this.setupPreview();
            }
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const recordingTime = document.getElementById('recording-time');
            if (recordingTime) {
                recordingTime.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            this.updateFileSize();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateFileSize() {
        let totalSize = 0;
        
        if (this.recordRTC) {
            const blob = this.recordRTC.getBlob();
            if (blob) {
                totalSize = blob.size;
            }
        }
        
        if (this.recordedChunks.length > 0) {
            totalSize += this.recordedChunks.reduce((total, chunk) => {
                return total + (chunk.size || 0);
            }, 0);
        }
        
        const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
        const fileSize = document.getElementById('file-size');
        if (fileSize) fileSize.textContent = `${sizeMB} MB`;
    }

    showSaveModal() {
        console.log('💾 Save modal gösteriliyor...');
        try {
            let finalBlob;
            
            if (this.recordedChunks.length === 1) {
                finalBlob = this.recordedChunks[0];
            } else {
                finalBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
            }
            
            const url = URL.createObjectURL(finalBlob);
            
            const previewVideo = document.getElementById('save-preview-video');
            previewVideo.src = url;
            
            document.getElementById('save-modal').classList.add('active');
            
            setTimeout(() => {
                this.setupVideoPlayer();
            }, 100);
            
            console.log('✅ Save modal gösterildi');
        } catch (error) {
            console.error('❌ Save modal hatası:', error);
            this.showNotification(this.t('previewCreateError'), 'error');
        }
    }

    setupVideoPlayer() {
        const video = document.getElementById('save-preview-video');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const playOverlay = document.getElementById('play-overlay');
        const videoOverlay = document.getElementById('video-overlay');
        const progressFill = document.getElementById('progress-fill');
        const progressHandle = document.getElementById('progress-handle');
        const progressContainer = document.querySelector('.progress-container');
        const currentTimeDisplay = document.getElementById('current-time-display');
        const durationDisplay = document.getElementById('duration-display');
        const volumeBtn = document.getElementById('volume-btn');
        const volumeRange = document.getElementById('volume-range');
        const fullscreenBtn = document.getElementById('fullscreen-btn');

        let isPlaying = false;
        let isDragging = false;

        const togglePlayPause = () => {
            if (isPlaying) {
                video.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                videoOverlay.classList.add('show');
                isPlaying = false;
            } else {
                video.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                videoOverlay.classList.remove('show');
                isPlaying = true;
            }
        };

        if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
        if (playOverlay) playOverlay.addEventListener('click', togglePlayPause);
        if (videoOverlay) videoOverlay.addEventListener('click', togglePlayPause);

        video.addEventListener('timeupdate', () => {
            if (!isDragging && video.duration) {
                const progress = (video.currentTime / video.duration) * 100;
                if (progressFill) progressFill.style.width = progress + '%';
                if (progressHandle) progressHandle.style.left = progress + '%';
                if (currentTimeDisplay) currentTimeDisplay.textContent = this.formatTime(video.currentTime);
            }
        });

        video.addEventListener('loadedmetadata', () => {
            if (durationDisplay) durationDisplay.textContent = this.formatTime(video.duration);
            
            const durationText = this.currentLanguage === 'tr' ? 'Süre' : 'Duration';
            const videoDuration = document.getElementById('video-duration');
            if (videoDuration) videoDuration.textContent = `${durationText}: ${this.formatTime(video.duration)}`;
            
            let totalSize = 0;
            if (this.recordedChunks.length > 0) {
                totalSize = this.recordedChunks.reduce((total, chunk) => {
                    return total + (chunk.size || 0);
                }, 0);
            }
            
            const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
            const sizeText = this.currentLanguage === 'tr' ? 'Boyut' : 'Size';
            const videoSize = document.getElementById('video-size');
            if (videoSize) videoSize.textContent = `${sizeText}: ${sizeMB} MB`;
        });

        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const progress = clickX / rect.width;
                video.currentTime = progress * video.duration;
            });
        }

        if (volumeRange) {
            volumeRange.addEventListener('input', (e) => {
                video.volume = e.target.value / 100;
                this.updateVolumeIcon(e.target.value);
            });
        }

        if (volumeBtn) {
            volumeBtn.addEventListener('click', () => {
                if (video.volume > 0) {
                    video.volume = 0;
                    if (volumeRange) volumeRange.value = 0;
                    this.updateVolumeIcon(0);
                } else {
                    video.volume = 1;
                    if (volumeRange) volumeRange.value = 100;
                    this.updateVolumeIcon(100);
                }
            });
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (video.requestFullscreen) {
                    video.requestFullscreen();
                }
            });
        }

        video.addEventListener('ended', () => {
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (videoOverlay) videoOverlay.classList.add('show');
            if (progressFill) progressFill.style.width = '0%';
            if (progressHandle) progressHandle.style.left = '0%';
        });

        if (videoOverlay) videoOverlay.classList.add('show');
    }

    updateVolumeIcon(volume) {
        const volumeBtn = document.getElementById('volume-btn');
        if (!volumeBtn) return;
        
        const icon = volumeBtn.querySelector('i');
        if (volume == 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (volume < 50) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async saveRecording() {
        console.log('💾 Video kaydediliyor...');
        if (this.recordedChunks.length === 0) {
            this.showNotification(this.t('noVideoToSave'), 'error');
            return;
        }

        try {
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const settingsText = `${this.videoSettings.resolution}_${this.videoSettings.fps}fps_${this.videoSettings.quality}`;
            const prefix = this.currentLanguage === 'tr' ? 'ekran-kaydi' : 'screen-recording';
            const defaultName = `${prefix}-${settingsText}-${timestamp}.mp4`;
            
            const filePath = await window.electronAPI.chooseSaveLocation(defaultName);
            
            if (!filePath) {
                this.showNotification(this.t('userCancelled'), 'warning');
                return;
            }
            
            const saveBtn = document.getElementById('save-recording');
            const originalText = saveBtn.innerHTML;
            const savingText = this.currentLanguage === 'tr' ? 
                '<i class="fas fa-spinner fa-spin"></i> MP4 Olarak Kaydediliyor...' :
                '<i class="fas fa-spinner fa-spin"></i> Saving as MP4...';
            saveBtn.innerHTML = savingText;
            saveBtn.disabled = true;
            
            let finalBlob;
            
            if (this.recordedChunks.length === 1) {
                finalBlob = this.recordedChunks[0];
            } else {
                finalBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
            }
            
            const arrayBuffer = await finalBlob.arrayBuffer();
            const result = await window.electronAPI.saveVideoFile(arrayBuffer, filePath);
            
            if (result.success) {
                this.showNotification(`${this.t('videoSaved')}: ${result.path}`);
                this.closeSaveModal();
                this.resetRecording();
            } else {
                this.showNotification(this.t('saveError') + ': ' + result.error, 'error');
            }
            
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            
        } catch (error) {
            console.error('❌ Kaydetme hatası:', error);
            this.showNotification(this.t('saveError') + ': ' + error.message, 'error');
            
            const saveBtn = document.getElementById('save-recording');
            const saveText = this.currentLanguage === 'tr' ? 
                '<i class="fas fa-download"></i> MP4 Olarak Kaydet' :
                '<i class="fas fa-download"></i> Save as MP4';
            saveBtn.innerHTML = saveText;
            saveBtn.disabled = false;
        }
    }

    discardRecording() {
        const previewVideo = document.getElementById('save-preview-video');
        if (previewVideo) {
            previewVideo.pause();
            previewVideo.src = '';
            previewVideo.load();
        }
        
        this.recordedChunks = [];
        this.closeSaveModal();
        this.resetRecording();
        this.showNotification(this.t('videoDeleted'));
    }

    resetRecording() {
        const recordingTime = document.getElementById('recording-time');
        const fileSize = document.getElementById('file-size');
        
        if (recordingTime) recordingTime.textContent = '00:00:00';
        if (fileSize) fileSize.textContent = '0 MB';
        
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.updateRecordingUI();
    }

    startClock() {
        setInterval(() => {
            const now = new Date();
            const locale = this.currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
            const timeString = now.toLocaleTimeString(locale, { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const currentTime = document.getElementById('current-time');
            if (currentTime) currentTime.textContent = timeString;
        }, 1000);
    }

    showNotification(message, type = 'success') {
        if (type === 'error') {
            alert('❌ ' + message);
        } else if (type === 'warning') {
            alert('⚠️ ' + message);
        } else {
            alert('✅ ' + message);
        }
    }
}




document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM yüklendi, ScreenRecorder başlatılıyor...');
    
    window.useRecordRTC = true;
    const recorder = new ScreenRecorder();
    window.screenRecorder = recorder;
});

