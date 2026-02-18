export const speakIndonesian = (text: string) => {
  // Check if voice is enabled in localStorage
  const voiceEnabled = localStorage.getItem('voiceEnabled');
  if (voiceEnabled === 'false') {
    console.log('Voice disabled by user');
    return;
  }

  // Check if browser supports Speech Synthesis
  if (!('speechSynthesis' in window)) {
    console.warn('Browser tidak support Text-to-Speech');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Wait for voices to load
  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find Indonesian voice
    const indonesianVoice = voices.find(
      (voice) => voice.lang === 'id-ID' || voice.lang.startsWith('id')
    );

    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.lang = 'id-ID';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  // Voices might not be loaded yet
  if (window.speechSynthesis.getVoices().length > 0) {
    setVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = setVoice;
  }
};

// Voice message templates
export const voiceMessages = {
  paymentSuccess: (total: number) => {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(total);
    return `Terima kasih. Total belanja ${formatted}. Pembayaran berhasil.`;
  },
  
  paymentCash: (total: number, change: number) => {
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(total);
    
    const formattedChange = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(change);
    
    return `Total belanja ${formattedTotal}. Kembalian ${formattedChange}. Terima kasih.`;
  },
  
  welcome: () => 'Selamat datang di toko kami.',
  
  thankYou: () => 'Terima kasih atas kunjungan Anda. Selamat berbelanja.',
};

// Test voice function
export const testVoice = () => {
  speakIndonesian('Halo, ini adalah tes suara.');
};
