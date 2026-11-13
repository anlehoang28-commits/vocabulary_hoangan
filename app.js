/**
 * VocabMaster SRS - Complete Single Page Application
 * Features:
 *  1. Vocabulary & Collections (Decks) Management + Smart AI Lookup + JSON Backup/Restore
 *  2. Spaced Repetition System (SRS) with 6 standard stages (1d, 3d, 7d, 14d, 30d, 60d)
 *  3. 4 Practice Modes: 3D Flashcard, Multiple Choice, EN->VI Typing, VI->EN Spelling Check
 *  4. Gamification: EXP & Level-up System, Daily Streak 🔥, Daily Quests with Claimable Rewards
 *  5. UI/UX: Fully Responsive, Dark/Light Mode, Web Speech API & Dictionary MP3 Audio
 */

// ============================================================================
// 1. SOUND & AUDIO ENGINE (Web Audio Synthesizer + SpeechSynthesis)
// ============================================================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.currentAudio = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  playSuccess() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  }

  playError() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playLevelUp() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const fanfare = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    fanfare.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0.001, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  }

  async playWordPronunciation(word, audioUrl, onStart, onEnd) {
    this.initContext();

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }

    if (onStart) onStart();

    const finish = () => {
      if (onEnd) onEnd();
    };

    if (audioUrl && audioUrl.startsWith('http')) {
      try {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        audio.onended = finish;
        audio.onerror = () => {
          this.fallbackSpeechSynthesis(word, finish);
        };
        await audio.play();
        return;
      } catch (err) {
        this.fallbackSpeechSynthesis(word, finish);
        return;
      }
    }

    this.fallbackSpeechSynthesis(word, finish);
  }

  fallbackSpeechSynthesis(word, onEnd) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onend = onEnd;
      utterance.onerror = onEnd;

      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('US')));
      if (enVoice) utterance.voice = enVoice;

      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  }
}

// ============================================================================
// 2. RESILIENT MULTI-TIER DICTIONARY & TRANSLATION SERVICE
// ============================================================================
class DictionaryService {
  static BUILTIN_LEXICON = {
    // --- 1. Essential TOEIC Contracts & Business (Danh mục Từ vựng TOEIC Kinh Doanh) ---
    'abide by': { phonetic: '/əˈbaɪd baɪ/', partOfSpeech: 'verb', vietnameseMeaning: 'tuân theo, chịu theo' },
    'agreement': { phonetic: '/əˈɡriːmənt/', partOfSpeech: 'noun', vietnameseMeaning: 'hợp đồng, sự thỏa thuận' },
    'assurance': { phonetic: '/əˈʃʊərəns/', partOfSpeech: 'noun', vietnameseMeaning: 'sự cam đoan, bảo đảm' },
    'cancellation': { phonetic: '/ˌkænsəˈleɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự hủy bỏ' },
    'determine': { phonetic: '/dɪˈtɜːmɪn/', partOfSpeech: 'verb', vietnameseMeaning: 'quyết định, xác định' },
    'engage': { phonetic: '/ɪnˈɡeɪdʒ/', partOfSpeech: 'verb', vietnameseMeaning: 'tham gia, hứa hẹn, thu hút' },
    'establish': { phonetic: '/ɪˈstæblɪʃ/', partOfSpeech: 'verb', vietnameseMeaning: 'thiết lập, thành lập' },
    'obligate': { phonetic: '/ˈɒblɪɡeɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'bắt buộc, cưỡng chế' },
    'party': { phonetic: '/ˈpɑːti/', partOfSpeech: 'noun', vietnameseMeaning: 'bên (trong hợp đồng), đối tác' },
    'provision': { phonetic: '/prəˈvɪʒn/', partOfSpeech: 'noun', vietnameseMeaning: 'điều khoản quy định' },
    'resolve': { phonetic: '/rɪˈzɒlv/', partOfSpeech: 'verb', vietnameseMeaning: 'giải quyết (vấn đề)' },
    'specific': { phonetic: '/spəˈsɪfɪk/', partOfSpeech: 'adjective', vietnameseMeaning: 'cụ thể, chi tiết' },
    'attract': { phonetic: '/əˈtrækt/', partOfSpeech: 'verb', vietnameseMeaning: 'thu hút, lôi cuốn' },
    'compare': { phonetic: '/kəmˈpeə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'so sánh, đối chiếu' },
    'competition': { phonetic: '/ˌkɒmpəˈtɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự cạnh tranh, cuộc thi' },
    'consume': { phonetic: '/kənˈsjuːm/', partOfSpeech: 'verb', vietnameseMeaning: 'tiêu thụ, tiêu dùng' },
    'convince': { phonetic: '/kənˈvɪns/', partOfSpeech: 'verb', vietnameseMeaning: 'thuyết phục' },
    'currently': { phonetic: '/ˈkʌrəntli/', partOfSpeech: 'adverb', vietnameseMeaning: 'hiện tại, hiện nay' },
    'fad': { phonetic: '/fæd/', partOfSpeech: 'noun', vietnameseMeaning: 'mốt nhất thời, xu hướng chóng tàn' },
    'inspiration': { phonetic: '/ˌɪnspəˈreɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'nguồn cảm hứng' },
    'market': { phonetic: '/ˈmɑːkɪt/', partOfSpeech: 'noun', vietnameseMeaning: 'thị trường, tiếp thị' },
    'persuasion': { phonetic: '/pəˈsweɪʒn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự thuyết phục' },
    'productive': { phonetic: '/prəˈdʌktɪv/', partOfSpeech: 'adjective', vietnameseMeaning: 'năng suất, sinh lợi' },
    'satisfaction': { phonetic: '/ˌsætɪsˈfækʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự hài lòng, thỏa mãn' },
    'characteristic': { phonetic: '/ˌkærəktəˈrɪstɪk/', partOfSpeech: 'noun', vietnameseMeaning: 'đặc trưng, đặc tính' },
    'consequence': { phonetic: '/ˈkɒnsɪkwəns/', partOfSpeech: 'noun', vietnameseMeaning: 'hậu quả, kết quả' },
    'consider': { phonetic: '/kənˈsɪdə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'cân nhắc, xem xét' },
    'cover': { phonetic: '/ˈkʌvə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'bao gồm, chi trả, bảo hiểm' },
    'expire': { phonetic: '/ɪkˈspaɪə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'hết hạn, hết hiệu lực' },
    'frequently': { phonetic: '/ˈfriːkwəntli/', partOfSpeech: 'adverb', vietnameseMeaning: 'thường xuyên, hay xảy ra' },
    'imply': { phonetic: '/ɪmˈplaɪ/', partOfSpeech: 'verb', vietnameseMeaning: 'ngụ ý, hàm ý' },
    'promise': { phonetic: '/ˈprɒmɪs/', partOfSpeech: 'verb', vietnameseMeaning: 'hứa hẹn, cam kết' },
    'protect': { phonetic: '/prəˈtekt/', partOfSpeech: 'verb', vietnameseMeaning: 'bảo vệ' },
    'reputation': { phonetic: '/ˌrepjuˈteɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'danh tiếng, uy tín' },
    'require': { phonetic: '/rɪˈkwaɪə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'yêu cầu, đòi hỏi' },
    'variety': { phonetic: '/vəˈraɪəti/', partOfSpeech: 'noun', vietnameseMeaning: 'sự đa dạng, phong phú' },
    'address': { phonetic: '/əˈdres/', partOfSpeech: 'verb', vietnameseMeaning: 'giải quyết, xử lý, địa chỉ' },
    'avoid': { phonetic: '/əˈvɔɪd/', partOfSpeech: 'verb', vietnameseMeaning: 'tránh, né tránh' },
    'demonstrate': { phonetic: '/ˈdemənstreɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'chứng minh, minh họa' },
    'develop': { phonetic: '/dɪˈveləp/', partOfSpeech: 'verb', vietnameseMeaning: 'phát triển, mở rộng' },
    'evaluate': { phonetic: '/ɪˈvæljueɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'đánh giá, định giá' },
    'gather': { phonetic: '/ˈɡæðə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'thu thập, tập hợp' },
    'offer': { phonetic: '/ˈɒfə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'đề xuất, chào hàng' },
    'primarily': { phonetic: '/praɪˈmerəli/', partOfSpeech: 'adverb', vietnameseMeaning: 'chủ yếu, trước hết' },
    'risk': { phonetic: '/rɪsk/', partOfSpeech: 'noun', vietnameseMeaning: 'rủi ro, nguy cơ' },
    'strategy': { phonetic: '/ˈstrætədʒi/', partOfSpeech: 'noun', vietnameseMeaning: 'chiến lược' },
    'substitute': { phonetic: '/ˈsʌbstɪtjuːt/', partOfSpeech: 'verb', vietnameseMeaning: 'thay thế, người thay thế' },

    // --- 2. Office & Business Operations ---
    'invest': { phonetic: '/ɪnˈvest/', partOfSpeech: 'verb', vietnameseMeaning: 'đầu tư, góp vốn' },
    'profit': { phonetic: '/ˈprɑː.fɪt/', partOfSpeech: 'noun', vietnameseMeaning: 'lợi nhuận, tiền lãi' },
    'customer': { phonetic: '/ˈkʌs.tə.mər/', partOfSpeech: 'noun', vietnameseMeaning: 'khách hàng, người mua' },
    'collaborate': { phonetic: '/kəˈlæb.ə.reɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'hợp tác, phối hợp làm việc' },
    'deadline': { phonetic: '/ˈded.laɪn/', partOfSpeech: 'noun', vietnameseMeaning: 'hạn chót, thời hạn hoàn thành' },
    'ubiquitous': { phonetic: '/juːˈbɪk.wə.t̬əs/', partOfSpeech: 'adjective', vietnameseMeaning: 'phổ biến khắp nơi' },
    'resilient': { phonetic: '/rɪˈzɪl.jənt/', partOfSpeech: 'adjective', vietnameseMeaning: 'kiên cường, mau phục hồi' },
    'serendipity': { phonetic: '/ˌser.ənˈdɪp.ə.t̬i/', partOfSpeech: 'noun', vietnameseMeaning: 'sự may mắn tình cờ' },
    'efficiency': { phonetic: '/ɪˈfɪʃ.ən.si/', partOfSpeech: 'noun', vietnameseMeaning: 'hiệu quả, năng suất cao' },
    'algorithm': { phonetic: '/ˈæl.ɡə.rɪ.ðəm/', partOfSpeech: 'noun', vietnameseMeaning: 'thuật toán' },
    'accommodate': { phonetic: '/əˈkɒmədeɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'đáp ứng, cung cấp chỗ' },
    'arrangement': { phonetic: '/əˈreɪndʒmənt/', partOfSpeech: 'noun', vietnameseMeaning: 'sự sắp xếp, thỏa thuận' },
    'association': { phonetic: '/əˌsəʊsiˈeɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'hiệp hội, sự kết hợp' },
    'attend': { phonetic: '/əˈtend/', partOfSpeech: 'verb', vietnameseMeaning: 'tham dự, có mặt' },
    'location': { phonetic: '/ləʊˈkeɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'địa điểm, vị trí' },
    'overcrowded': { phonetic: '/ˌəʊvəˈkraʊdɪd/', partOfSpeech: 'adjective', vietnameseMeaning: 'quá đông đúc' },
    'register': { phonetic: '/ˈredʒɪstə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'đăng ký, ghi danh' },
    'select': { phonetic: '/sɪˈlekt/', partOfSpeech: 'verb', vietnameseMeaning: 'chọn lựa, tuyển chọn' },
    'session': { phonetic: '/ˈseʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'phiên họp, buổi làm việc' },
    'access': { phonetic: '/ˈækses/', partOfSpeech: 'verb', vietnameseMeaning: 'truy cập, tiếp cận' },
    'allocate': { phonetic: '/ˈæləkeɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'phân bổ, chỉ định vốn' },
    'compatible': { phonetic: '/kəmˈpætəbl/', partOfSpeech: 'adjective', vietnameseMeaning: 'tương thích, phù hợp' },
    'delete': { phonetic: '/dɪˈliːt/', partOfSpeech: 'verb', vietnameseMeaning: 'xóa bỏ' },
    'display': { phonetic: '/dɪˈspleɪ/', partOfSpeech: 'verb', vietnameseMeaning: 'hiển thị, trưng bày' },
    'duplicate': { phonetic: '/ˈdjuːplɪkeɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'nhân bản, sao chép' },
    'failure': { phonetic: '/ˈfeɪljə(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'sự thất bại, sự hỏng hóc' },
    'ignore': { phonetic: '/ɪɡˈnɔː(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'phớt lờ, bỏ qua' },
    'search': { phonetic: '/sɜːtʃ/', partOfSpeech: 'verb', vietnameseMeaning: 'tìm kiếm' },
    'warning': { phonetic: '/ˈwɔːnɪŋ/', partOfSpeech: 'noun', vietnameseMeaning: 'lời cảnh báo' },
    'afford': { phonetic: '/əˈfɔːd/', partOfSpeech: 'verb', vietnameseMeaning: 'có khả năng chi trả' },
    'capacity': { phonetic: '/kəˈpæsəti/', partOfSpeech: 'noun', vietnameseMeaning: 'sức chứa, năng lực' },
    'durable': { phonetic: '/ˈdjʊərəbl/', partOfSpeech: 'adjective', vietnameseMeaning: 'bền bỉ, lâu bền' },
    'initiative': { phonetic: '/ɪˈnɪʃətɪv/', partOfSpeech: 'noun', vietnameseMeaning: 'sáng kiến, tính chủ động' },
    'provider': { phonetic: '/prəˈvaɪdə(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'nhà cung cấp' },
    'reduction': { phonetic: '/rɪˈdʌkʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự cắt giảm, giảm bớt' },
    'stock': { phonetic: '/stɒk/', partOfSpeech: 'noun', vietnameseMeaning: 'hàng tồn kho, cổ phiếu' },
    'appreciate': { phonetic: '/əˈpriːʃieɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'đánh giá cao, cảm kích' },
    'outdated': { phonetic: '/ˌaʊtˈdeɪtɪd/', partOfSpeech: 'adjective', vietnameseMeaning: 'lỗi thời, hết hạn' },
    'practice': { phonetic: '/ˈpræktɪs/', partOfSpeech: 'noun', vietnameseMeaning: 'thông lệ, thực hành' },
    'reinforce': { phonetic: '/ˌriːɪnˈfɔːs/', partOfSpeech: 'verb', vietnameseMeaning: 'củng cố, tăng cường' },
    'device': { phonetic: '/dɪˈvaɪs/', partOfSpeech: 'noun', vietnameseMeaning: 'thiết bị, dụng cụ' },
    'facilitate': { phonetic: '/fəˈsɪlɪteɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'tạo điều kiện thuận lợi' },
    'network': { phonetic: '/ˈnetwɜːk/', partOfSpeech: 'noun', vietnameseMeaning: 'mạng lưới, kết nối mạng' },
    'popularity': { phonetic: '/ˌpɒpjuˈlærəti/', partOfSpeech: 'noun', vietnameseMeaning: 'sự phổ biến, ưa chuộng' },
    'process': { phonetic: '/ˈprəʊses/', partOfSpeech: 'noun', vietnameseMeaning: 'quy trình, xử lý' },
    'replace': { phonetic: '/rɪˈpleɪs/', partOfSpeech: 'verb', vietnameseMeaning: 'thay thế' },
    'software': { phonetic: '/ˈsɒftweə(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'phần mềm' },
    'assemble': { phonetic: '/əˈsembl/', partOfSpeech: 'verb', vietnameseMeaning: 'lắp ráp, tập hợp' },
    'courier': { phonetic: '/ˈkʊriə(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'người chuyển phát nhanh' },
    'express': { phonetic: '/ɪkˈspres/', partOfSpeech: 'adjective', vietnameseMeaning: 'hỏa tốc, nhanh chóng' },
    'mention': { phonetic: '/ˈmenʃn/', partOfSpeech: 'verb', vietnameseMeaning: 'đề cập, nói đến' },
    'proof': { phonetic: '/pruːf/', partOfSpeech: 'noun', vietnameseMeaning: 'bằng chứng, bản in thử' },
    'revise': { phonetic: '/rɪˈvaɪz/', partOfSpeech: 'verb', vietnameseMeaning: 'sửa đổi, xem lại' },

    // --- 3. Personnel, Recruitment, Salaries & Benefits ---
    'candidate': { phonetic: '/ˈkændɪdət/', partOfSpeech: 'noun', vietnameseMeaning: 'ứng viên, người dự tuyển' },
    'recruit': { phonetic: '/rɪˈkruːt/', partOfSpeech: 'verb', vietnameseMeaning: 'tuyển dụng, chiêu mộ' },
    'submit': { phonetic: '/səbˈmɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'nộp, đệ trình' },
    'ability': { phonetic: '/əˈbɪləti/', partOfSpeech: 'noun', vietnameseMeaning: 'khả năng, năng lực' },
    'apply': { phonetic: '/əˈplaɪ/', partOfSpeech: 'verb', vietnameseMeaning: 'nộp đơn xin việc, áp dụng' },
    'background': { phonetic: '/ˈbækɡraʊnd/', partOfSpeech: 'noun', vietnameseMeaning: 'lý lịch, bối cảnh' },
    'confidence': { phonetic: '/ˈkɒnfɪdəns/', partOfSpeech: 'noun', vietnameseMeaning: 'sự tự tin, tin tưởng' },
    'expert': { phonetic: '/ˈekspɜːt/', partOfSpeech: 'noun', vietnameseMeaning: 'chuyên gia' },
    'conduct': { phonetic: '/kənˈdʌkt/', partOfSpeech: 'verb', vietnameseMeaning: 'tiến hành, chỉ đạo' },
    'generate': { phonetic: '/ˈdʒenəreɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'tạo ra, sinh ra' },
    'hire': { phonetic: '/ˈhaɪə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'thuê, tuyển dụng' },
    'mentor': { phonetic: '/ˈmentɔː(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'người hướng dẫn, cố vấn' },
    'reject': { phonetic: '/rɪˈdʒekt/', partOfSpeech: 'verb', vietnameseMeaning: 'từ chối, bác bỏ' },
    'training': { phonetic: '/ˈtreɪnɪŋ/', partOfSpeech: 'noun', vietnameseMeaning: 'sự đào tạo, huấn luyện' },
    'update': { phonetic: '/ˌʌpˈdeɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'cập nhật, làm mới' },
    'benefit': { phonetic: '/ˈbenɪfɪt/', partOfSpeech: 'noun', vietnameseMeaning: 'lợi ích, phúc lợi' },
    'compensate': { phonetic: '/ˈkɒmpənseɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'bồi thường, trả lương' },
    'eligible': { phonetic: '/ˈelɪdʒəbl/', partOfSpeech: 'adjective', vietnameseMeaning: 'đủ điều kiện, thích hợp' },
    'negotiate': { phonetic: '/nɪˈɡəʊʃieɪt/', partOfSpeech: 'verb', vietnameseMeaning: 'đàm phán, thương lượng' },
    'raise': { phonetic: '/reɪz/', partOfSpeech: 'noun', vietnameseMeaning: 'tăng lương, nâng lên' },
    'retire': { phonetic: '/rɪˈtaɪə(r)/', partOfSpeech: 'verb', vietnameseMeaning: 'nghỉ hưu' },
    'wage': { phonetic: '/weɪdʒ/', partOfSpeech: 'noun', vietnameseMeaning: 'tiền lương theo giờ/tuần' },
    'achievement': { phonetic: '/əˈtʃiːvmənt/', partOfSpeech: 'noun', vietnameseMeaning: 'thành tích, thành tựu' },
    'contribute': { phonetic: '/kənˈtrɪbjuːt/', partOfSpeech: 'verb', vietnameseMeaning: 'đóng góp, cống hiến' },
    'dedication': { phonetic: '/ˌdedɪˈkeɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự cống hiến, tận tụy' },
    'loyal': { phonetic: '/ˈlɔɪəl/', partOfSpeech: 'adjective', vietnameseMeaning: 'trung thành, tận tâm' },
    'promote': { phonetic: '/prəˈməʊt/', partOfSpeech: 'verb', vietnameseMeaning: 'thăng chức, quảng bá' },
    'recognition': { phonetic: '/ˌrekəɡˈnɪʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'sự công nhận, tôn vinh' },
    'value': { phonetic: '/ˈvæljuː/', partOfSpeech: 'noun', vietnameseMeaning: 'giá trị, coi trọng' },

    // --- 4. Finance, Banking, Inventory & Shipping ---
    'bargain': { phonetic: '/ˈbɑːɡən/', partOfSpeech: 'noun', vietnameseMeaning: 'mặc cả, món hời' },
    'expand': { phonetic: '/ɪkˈspænd/', partOfSpeech: 'verb', vietnameseMeaning: 'mở rộng, phát triển' },
    'item': { phonetic: '/ˈaɪtəm/', partOfSpeech: 'noun', vietnameseMeaning: 'món đồ, mặt hàng' },
    'mandatory': { phonetic: '/ˈmændətəri/', partOfSpeech: 'adjective', vietnameseMeaning: 'bắt buộc' },
    'merchandise': { phonetic: '/ˈmɜːtʃəndaɪs/', partOfSpeech: 'noun', vietnameseMeaning: 'hàng hóa' },
    'trend': { phonetic: '/trend/', partOfSpeech: 'noun', vietnameseMeaning: 'xu hướng, thị hiếu' },
    'maintain': { phonetic: '/meɪnˈteɪn/', partOfSpeech: 'verb', vietnameseMeaning: 'duy trì, bảo dưỡng' },
    'obtain': { phonetic: '/əbˈteɪn/', partOfSpeech: 'verb', vietnameseMeaning: 'đạt được, thu được' },
    'quality': { phonetic: '/ˈkwɒləti/', partOfSpeech: 'noun', vietnameseMeaning: 'chất lượng' },
    'carrier': { phonetic: '/ˈkæriə(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'công ty vận chuyển' },
    'fulfill': { phonetic: '/fʊlˈfɪl/', partOfSpeech: 'verb', vietnameseMeaning: 'hoàn thành, đáp ứng đơn hàng' },
    'inventory': { phonetic: '/ˈɪnvəntri/', partOfSpeech: 'noun', vietnameseMeaning: 'hàng tồn kho, kiểm kê' },
    'shipment': { phonetic: '/ˈʃɪpmənt/', partOfSpeech: 'noun', vietnameseMeaning: 'lô hàng, việc giao hàng' },
    'supply': { phonetic: '/səˈplaɪ/', partOfSpeech: 'noun', vietnameseMeaning: 'cung cấp, nguồn cung' },
    'invoice': { phonetic: '/ˈɪnvɔɪs/', partOfSpeech: 'noun', vietnameseMeaning: 'hóa đơn thanh toán' },
    'order': { phonetic: '/ˈɔːdə(r)/', partOfSpeech: 'noun', vietnameseMeaning: 'đơn đặt hàng, đặt hàng' },
    'balance': { phonetic: '/ˈbæləns/', partOfSpeech: 'noun', vietnameseMeaning: 'số dư tài khoản, cân bằng' },
    'deduct': { phonetic: '/dɪˈdʌkt/', partOfSpeech: 'verb', vietnameseMeaning: 'khấu trừ, trừ đi' },
    'dividend': { phonetic: '/ˈdɪvɪdend/', partOfSpeech: 'noun', vietnameseMeaning: 'cổ tức' },
    'mortgage': { phonetic: '/ˈmɔːɡɪdʒ/', partOfSpeech: 'noun', vietnameseMeaning: 'thế chấp, vay mua nhà' },
    'restrict': { phonetic: '/rɪˈstrɪkt/', partOfSpeech: 'verb', vietnameseMeaning: 'hạn chế, giới hạn' },
    'transaction': { phonetic: '/trænˈzækʃn/', partOfSpeech: 'noun', vietnameseMeaning: 'giao dịch' },
    'asset': { phonetic: '/ˈæset/', partOfSpeech: 'noun', vietnameseMeaning: 'tài sản' },
    'audit': { phonetic: '/ˈɔːdɪt/', partOfSpeech: 'noun', vietnameseMeaning: 'kiểm toán' },
    'budget': { phonetic: '/ˈbʌdʒɪt/', partOfSpeech: 'noun', vietnameseMeaning: 'ngân sách' },
    'client': { phonetic: '/ˈklaɪənt/', partOfSpeech: 'noun', vietnameseMeaning: 'khách hàng' },
    'debt': { phonetic: '/det/', partOfSpeech: 'noun', vietnameseMeaning: 'khoản nợ' },
    'expense': { phonetic: '/ɪkˈspens/', partOfSpeech: 'noun', vietnameseMeaning: 'chi phí, tổn thất' },
    'outstanding': { phonetic: '/aʊtˈstændɪŋ/', partOfSpeech: 'adjective', vietnameseMeaning: 'nổi bật, chưa thanh toán' },
    'profitable': { phonetic: '/ˈprɒfɪtəbl/', partOfSpeech: 'adjective', vietnameseMeaning: 'sinh lời, có lãi' },
    'refund': { phonetic: '/ˈriːfʌnd/', partOfSpeech: 'noun', vietnameseMeaning: 'hoàn tiền' },
    'revenue': { phonetic: '/ˈrevənjuː/', partOfSpeech: 'noun', vietnameseMeaning: 'doanh thu' },
    'warranty': { phonetic: '/ˈwɒrənti/', partOfSpeech: 'noun', vietnameseMeaning: 'giấy bảo hành, sự cam kết' }
  };

  static BUILTIN_DEFINITIONS = {
    'invest': 'put money into financial schemes, shares, or property with the expectation of achieving a profit',
    'profit': 'a financial gain, especially the difference between the amount earned and the amount spent',
    'customer': 'a person or organization that buys goods or services from a store or business',
    'collaborate': 'work jointly on an activity or project to produce or create something',
    'deadline': 'the latest time or date by which something should be completed',
    'ubiquitous': 'present, appearing, or found everywhere at the same time',
    'resilient': 'able to withstand or recover quickly from difficult conditions',
    'serendipity': 'the occurrence and development of events by chance in a happy or beneficial way',
    'efficiency': 'the state or quality of being efficient; achieving maximum productivity with minimum wasted effort',
    'algorithm': 'a process or set of rules to be followed in calculations or other problem-solving operations',
    'abide by': 'accept or act in accordance with a rule, decision, or recommendation',
    'agreement': 'harmony or accordance in opinion or feeling; a negotiated and typically legally binding arrangement',
    'assurance': 'a positive declaration intended to give confidence; a promise',
    'cancellation': 'the action of revoking or annulling something; deciding that an organized event will not happen',
    'determine': 'cause (something) to occur in a particular way; be the decisive factor in',
    'engage': 'participate or become involved in; occupy or attract someone interest or attention',
    'establish': 'set up on a firm or permanent basis; initiate or bring about',
    'obligate': 'bind legally or morally; constrain',
    'party': 'a person or group participating in an action, affair, or contract',
    'provision': 'a condition or requirement in a legal document or contract',
    'resolve': 'settle or find a solution to (a problem or contentious matter)',
    'specific': 'clearly defined or identified; precise and detailed',
    'attract': 'cause to come to a place or participate in a venture by offering something of interest',
    'compare': 'estimate, measure, or note the similarity or dissimilarity between',
    'competition': 'the activity or condition of striving to gain or win something by defeating others',
    'consume': 'buy or use (goods or services); eat, drink, or ingest',
    'convince': 'cause (someone) to believe firmly in the truth of something; persuade',
    'currently': 'at the present time; now',
    'fad': 'an intense and widely shared enthusiasm for something, especially one that is short-lived',
    'inspiration': 'the process of being mentally stimulated to do or feel something creative',
    'market': 'an area or arena in which commercial dealings are conducted; demand for a product',
    'persuasion': 'the action or fact of persuading someone or of being persuaded to do or believe something',
    'productive': 'producing or able to produce large amounts of goods, crops, or other commodities',
    'satisfaction': 'fulfillment of one wishes, expectations, or needs, or the pleasure derived from this',
    'characteristic': 'a feature or quality belonging typically to a person, place, or thing',
    'consequence': 'a result or effect of an action or condition',
    'strategy': 'a plan of action or policy designed to achieve a major or overall aim'
  };

  static getDefinitionEn(card) {
    if (!card) return '';
    if (card.definitionEn && card.definitionEn.trim()) return card.definitionEn.trim();
    const clean = (card.word || '').trim().toLowerCase();
    if (this.BUILTIN_DEFINITIONS[clean]) return this.BUILTIN_DEFINITIONS[clean];
    const pos = (card.partOfSpeech || 'noun').toLowerCase();
    const vm = card.vietnameseMeaning || '';
    if (pos === 'verb') return `to perform the action of: ${vm}`;
    if (pos === 'adjective') return `having the characteristic or quality of: ${vm}`;
    if (pos === 'adverb') return `in a manner expressing: ${vm}`;
    return `the concept, item, or condition of: ${vm}`;
  }

  static async fetchWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  static async lookupWord(word) {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) throw new Error('Vui lòng nhập từ vựng.');

    // 1. Check Built-in Lexicon first (Instant & 100% accurate)
    if (this.BUILTIN_LEXICON[cleanWord]) {
      const item = this.BUILTIN_LEXICON[cleanWord];
      return {
        word: cleanWord,
        phonetic: item.phonetic || '',
        partOfSpeech: item.partOfSpeech || 'noun',
        vietnameseMeaning: item.vietnameseMeaning || '',
        exampleEn: '',
        exampleVi: '',
        distractors: this.generateDistractors(item.vietnameseMeaning),
        audioUrl: `https://api.dictionaryapi.dev/media/pronunciations/en/${cleanWord}-us.mp3`
      };
    }

    let result = {
      word: cleanWord,
      phonetic: '',
      partOfSpeech: 'noun',
      vietnameseMeaning: '',
      exampleEn: '',
      exampleVi: '',
      distractors: [],
      audioUrl: ''
    };

    // 2. Fetch from Free Dictionary API (Phonetics, Audio, Part of speech)
    try {
      const endpoint = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;
      const response = await this.fetchWithTimeout(endpoint, 3500);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data[0]) {
          const entry = data[0];
          result.phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || '';

          if (entry.phonetics && Array.isArray(entry.phonetics)) {
            const audioObj = entry.phonetics.find(p => p.audio && p.audio.length > 0);
            if (audioObj) result.audioUrl = audioObj.audio;
          }

          if (entry.meanings && entry.meanings[0]) {
            result.partOfSpeech = entry.meanings[0].partOfSpeech || 'noun';
          }
        }
      }
    } catch (e) {
      console.warn('Free Dictionary API call skipped/failed:', e);
    }

    // 3. Translate Meaning via Google Translate Client API (Fast & Accurate)
    try {
      const gEndpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(cleanWord)}`;
      const gRes = await this.fetchWithTimeout(gEndpoint, 3500);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && gData[0] && gData[0][0] && gData[0][0][0]) {
          const translated = gData[0][0][0].trim();
          if (translated && !translated.toLowerCase().includes('sorry')) {
            result.vietnameseMeaning = translated.toLowerCase();
          }
        }
      }
    } catch (e) {
      console.warn('Google Translate API failed, trying fallback:', e);
    }

    // 4. Secondary fallback: MyMemory Translation API
    if (!result.vietnameseMeaning) {
      try {
        const transEndpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`;
        const transRes = await this.fetchWithTimeout(transEndpoint, 3000);
        if (transRes.ok) {
          const transData = await transRes.json();
          if (transData && transData.responseData && transData.responseData.translatedText) {
            const text = transData.responseData.translatedText.trim();
            // Ignore quota warning messages
            if (!text.toUpperCase().includes('MYMEMORY WARNING') && !text.toUpperCase().includes('LIMITS.PHP')) {
              result.vietnameseMeaning = text.toLowerCase();
            }
          }
        }
      } catch (e) {
        console.warn('MyMemory fallback failed:', e);
      }
    }

    // Never use dummy 'nghĩa của từ ...'! Leave empty for user input if not found.
    result.exampleEn = '';
    result.exampleVi = '';

    // Generate 3 plausible distractors for Quiz
    result.distractors = this.generateDistractors(result.vietnameseMeaning);

    return result;
  }

  static generateDistractors(meaning = '') {
    const pool = [
      'hợp đồng, sự thỏa thuận',
      'tuân theo, chịu theo',
      'sự cam đoan, bảo đảm',
      'sự hủy bỏ',
      'quyết định, xác định',
      'tham gia, hứa hẹn',
      'thiết lập, thành lập',
      'bắt buộc, cưỡng chế',
      'bên (trong hợp đồng), đối tác',
      'điều khoản quy định',
      'giải quyết (vấn đề)',
      'cụ thể, chi tiết',
      'thu hút, lôi cuốn',
      'so sánh, đối chiếu',
      'sự cạnh tranh, cuộc thi',
      'tiêu thụ, tiêu dùng',
      'thuyết phục',
      'hiện tại, hiện nay',
      'lợi nhuận, tiền lãi',
      'đầu tư, góp vốn',
      'khách hàng, người mua',
      'hạn chót hoàn thành',
      'sự trì hoãn không cần thiết',
      'khoản nợ đến hạn',
      'chiến lược tiếp thị',
      'hiệu suất làm việc vượt trội',
      'thời hạn bảo hành tiêu chuẩn',
      'nguồn cảm hứng sáng tạo',
      'phương thức thanh toán linh hoạt'
    ];
    const safeMeaning = (meaning || '').toLowerCase();
    const filtered = pool.filter(p => !safeMeaning || !p.toLowerCase().includes(safeMeaning));
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }
}

// ============================================================================
// 3. SPACED REPETITION SYSTEM (SRS) LOGIC & HELPERS
// ============================================================================
/**
 * 6 Standard SRS Intervals:
 * Level 1: Học từ mới (Ngày 1) -> Ôn sau 1 ngày (Day +1)
 * Level 2: Ôn sau 1 ngày -> Ôn sau 3 ngày kể từ lần 2 (Day +3)
 * Level 3: Ôn sau 3 ngày -> Ôn sau 7 ngày kể từ lần 3 (Day +7)
 * Level 4: Ôn sau 7 ngày -> Ôn sau 14 ngày kể từ lần 4 (Day +14)
 * Level 5: Ôn sau 14 ngày -> Ôn sau 30 ngày kể từ lần 5 (Day +30)
 * Level 6: Ôn sau 30 ngày -> Nới rộng 60 ngày nếu nhớ vững
 */
const SRS_INTERVALS = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
  6: 60
};

class SRSEngine {
  static getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  static addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  }

  static isDueToday(card) {
    if (!card) return false;
    const today = this.getTodayString();
    if (!card.nextReviewDate) return true; // new card
    return card.nextReviewDate <= today;
  }

  static recordReview(card, isSuccess) {
    const today = this.getTodayString();
    const currentLevel = card.level || 1;

    if (isSuccess) {
      const nextLevel = Math.min(6, currentLevel + 1);
      const interval = SRS_INTERVALS[currentLevel] || 1;
      card.level = nextLevel;
      card.lastReviewedDate = today;
      card.nextReviewDate = this.addDays(today, interval);
      card.reviewCount = (card.reviewCount || 0) + 1;
      card.consecutiveCorrect = (card.consecutiveCorrect || 0) + 1;
      if (nextLevel >= 6) {
        card.mastered = true;
      }
    } else {
      // Failed: reset to Level 1, review again today
      card.level = 1;
      card.lastReviewedDate = today;
      card.nextReviewDate = today;
      card.mastered = false;
      card.reviewCount = (card.reviewCount || 0) + 1;
      card.consecutiveCorrect = 0;
      card.wrongCount = (card.wrongCount || 0) + 1;
    }

    return card;
  }

  static getLevelBadgeHtml(level) {
    const lvl = level || 1;
    const labels = {
      1: 'Mốc 1 (Ôn sau 1d)',
      2: 'Mốc 2 (Ôn sau 3d)',
      3: 'Mốc 3 (Ôn sau 7d)',
      4: 'Mốc 4 (Ôn sau 14d)',
      5: 'Mốc 5 (Ôn sau 30d)',
      6: 'Mốc 6 (Thuộc vững)'
    };
    return `<span class="text-[10px] font-mono px-2 py-0.5 rounded-md srs-badge-${lvl} border font-semibold">SRS ${labels[lvl]}</span>`;
  }
}

// ============================================================================
// 4. GAMIFICATION: EXP, LEVEL & QUESTS SYSTEM
// ============================================================================
const USER_LEVELS = [
  { level: 1, title: 'Tập Sự (Novice)', minExp: 0, maxExp: 100 },
  { level: 2, title: 'Học Viên (Explorer)', minExp: 100, maxExp: 250 },
  { level: 3, title: 'Chiến Binh (Warrior)', minExp: 250, maxExp: 500 },
  { level: 4, title: 'Tinh Anh (Scholar)', minExp: 500, maxExp: 1000 },
  { level: 5, title: 'Bậc Thầy (Master)', minExp: 1000, maxExp: 2000 },
  { level: 6, title: 'Huyền Thoại (Legend)', minExp: 2000, maxExp: 999999 }
];

const DEFAULT_QUESTS = [
  { id: 'quest-review', title: 'Hoàn thành 1 bài ôn tập từ vựng', target: 1, current: 0, exp: 30, claimed: false },
  { id: 'quest-add', title: 'Thêm 2 từ vựng mới vào kho', target: 2, current: 0, exp: 40, claimed: false },
  { id: 'quest-streak-combo', title: 'Trả lời đúng 5 câu liên tiếp', target: 5, current: 0, exp: 50, claimed: false },
  { id: 'quest-srs', title: 'Ôn tập 6 từ đến hạn SRS hôm nay', target: 6, current: 0, exp: 60, claimed: false }
];

class GamificationEngine {
  static getExpData() {
    try {
      const data = localStorage.getItem('vocabmaster_exp_data_v2');
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { exp: 0, level: 1 };
  }

  static saveExpData(data) {
    localStorage.setItem('vocabmaster_exp_data_v2', JSON.stringify(data));
  }

  static addExp(amount) {
    const data = this.getExpData();
    const oldLevel = data.level;
    data.exp += amount;

    // Check level
    let newLevel = 1;
    for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
      if (data.exp >= USER_LEVELS[i].minExp) {
        newLevel = USER_LEVELS[i].level;
        break;
      }
    }
    data.level = newLevel;
    this.saveExpData(data);

    return {
      totalExp: data.exp,
      level: data.level,
      isLevelUp: newLevel > oldLevel,
      oldLevel,
      newLevel,
      title: USER_LEVELS.find(l => l.level === newLevel)?.title || 'Tập Sự'
    };
  }

  static getStreakData() {
    try {
      const data = localStorage.getItem('vocabmaster_streak_data_v2');
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { count: 0, lastDate: '' };
  }

  static updateStreakOnStudy() {
    const today = SRSEngine.getTodayString();
    const streak = this.getStreakData();

    if (streak.lastDate === today) {
      return streak.count;
    }

    const yesterday = SRSEngine.addDays(today, -1);
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
    streak.lastDate = today;
    localStorage.setItem('vocabmaster_streak_data_v2', JSON.stringify(streak));
    return streak.count;
  }

  static getDailyQuests() {
    const today = SRSEngine.getTodayString();
    try {
      const data = localStorage.getItem('vocabmaster_quests_v2');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.date === today && Array.isArray(parsed.quests)) {
          return parsed.quests;
        }
      }
    } catch (e) {}

    // Init fresh quests for today
    const freshQuests = DEFAULT_QUESTS.map(q => ({ ...q, current: 0, claimed: false }));
    this.saveDailyQuests(freshQuests);
    return freshQuests;
  }

  static saveDailyQuests(quests) {
    const today = SRSEngine.getTodayString();
    localStorage.setItem('vocabmaster_quests_v2', JSON.stringify({ date: today, quests }));
  }

  static updateQuestProgress(questId, increment = 1) {
    const quests = this.getDailyQuests();
    const quest = quests.find(q => q.id === questId);
    if (quest && !quest.claimed) {
      quest.current = Math.min(quest.target, quest.current + increment);
      this.saveDailyQuests(quests);
      return quest;
    }
    return null;
  }

  static claimQuest(questId) {
    const quests = this.getDailyQuests();
    const quest = quests.find(q => q.id === questId);
    if (quest && !quest.claimed && quest.current >= quest.target) {
      quest.claimed = true;
      this.saveDailyQuests(quests);
      const expResult = this.addExp(quest.exp);
      return { success: true, expGained: quest.exp, expResult };
    }
    return { success: false };
  }
}

// ============================================================================
// 5. DIFF ENGINE & MASTERY CALCULATOR FOR INTERACTIVE SESSION
// ============================================================================
class DiffEngine {
  static diffCharacters(inputStr, targetStr) {
    const s1 = (inputStr || '').trim();
    const s2 = (targetStr || '').trim();
    if (!s1) {
      const targetHtml = Array.from(s2).map(ch => `<span class="char-diff-correct">${ch}</span>`).join('');
      return {
        userHtml: '<span class="text-slate-400 italic text-xs">(Không nhớ / Bỏ qua)</span>',
        targetHtml
      };
    }

    const lower1 = s1.toLowerCase();
    const lower2 = s2.toLowerCase();
    const m = lower1.length;
    const n = lower2.length;

    // LCS table
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (lower1[i] === lower2[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    // Backtrack LCS pairs
    let i = m, j = n;
    const lcsPairs = [];
    while (i > 0 && j > 0) {
      if (lower1[i - 1] === lower2[j - 1]) {
        lcsPairs.push({ idx1: i - 1, idx2: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    lcsPairs.reverse();

    const match1 = new Set(lcsPairs.map(p => p.idx1));
    const match2 = new Set(lcsPairs.map(p => p.idx2));

    const userHtml = Array.from(s1).map((ch, idx) => {
      if (match1.has(idx)) {
        return `<span class="char-diff-correct">${ch}</span>`;
      } else {
        return `<span class="char-diff-wrong">${ch}</span>`;
      }
    }).join('');

    const targetHtml = Array.from(s2).map((ch, idx) => {
      if (match2.has(idx)) {
        return `<span class="char-diff-correct">${ch}</span>`;
      } else {
        return `<span class="char-diff-missing">${ch}</span>`;
      }
    }).join('');

    return { userHtml, targetHtml };
  }

  static getMasteryInfo(card) {
    if (!card) return { score: '0.0/10', name: 'No Memory', color: '#ef4444' };
    const lvl = Math.min(6, Math.max(1, card.level || 1));
    const score = ((lvl - 1) * 2).toFixed(1);
    const levels = {
      1: { name: 'No Memory', color: '#ef4444' },
      2: { name: 'Fragile Memory', color: '#f59e0b' },
      3: { name: 'Active Recall', color: '#eab308' },
      4: { name: 'Confident Recall', color: '#3b82f6' },
      5: { name: 'Confident Recall', color: '#3b82f6' },
      6: { name: 'Long-Term Retention', color: '#10b981' }
    };
    const info = levels[lvl] || levels[1];
    return {
      score: `${score}/10`,
      name: info.name,
      color: info.color
    };
  }
}

// ============================================================================
// 6. FUZZY MATCH & SPELLING VALIDATION ENGINE
// ============================================================================
class FuzzyMatchEngine {
  static normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–—]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  static removeAccents(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  static evaluateVietnameseMeaning(userText, expectedMeaning) {
    const normUser = this.normalize(userText);
    const normExpected = this.normalize(expectedMeaning);

    if (!normUser) return { isCorrect: false, score: 0 };
    if (normUser === normExpected) return { isCorrect: true, score: 100 };

    const noAccentUser = this.removeAccents(normUser);
    const noAccentExpected = this.removeAccents(normExpected);
    if (noAccentUser === noAccentExpected) return { isCorrect: true, score: 95 };

    const userTokens = normUser.split(' ').filter(Boolean);
    const expectedTokens = normExpected.split(' ').filter(Boolean);

    let matchCount = 0;
    userTokens.forEach(t => {
      if (expectedTokens.includes(t)) matchCount++;
    });

    const overlap = matchCount / Math.max(userTokens.length, expectedTokens.length);
    if (overlap >= 0.5) {
      return { isCorrect: true, score: Math.round(overlap * 100) };
    }

    return { isCorrect: false, score: Math.round(overlap * 100) };
  }

  static evaluateEnglishSpelling(userWord, expectedWord) {
    const u = userWord.trim().toLowerCase();
    const e = expectedWord.trim().toLowerCase();
    return u === e;
  }
}

// ============================================================================
// 6. DEFAULT SEEDED DATA (DECKS & VOCABULARY)
// ============================================================================
const DEFAULT_DECKS = [
  {
    id: 'deck-toeic',
    name: '💼 TOEIC 750+ Thông Dụng',
    description: 'Từ vựng thương mại, tài chính, hợp đồng và công sở chuẩn format bài thi TOEIC.',
    color: 'indigo',
    createdAt: Date.now() - 1000000
  },
  {
    id: 'deck-tech',
    name: '💻 Công Nghệ & Lập Trình',
    description: 'Thuật ngữ ngành Công Nghệ Thông Tin, AI, Kiến trúc phần mềm và Cloud Computing.',
    color: 'cyan',
    createdAt: Date.now() - 900000
  },
  {
    id: 'deck-comm',
    name: '🗣️ Giao Tiếp Hàng Ngày',
    description: 'Từ vựng thông dụng thể hiện cảm xúc, phẩm chất, quan điểm và đối thoại đời sống.',
    color: 'emerald',
    createdAt: Date.now() - 800000
  },
  {
    id: 'deck-ielts',
    name: '🎓 IELTS Academic Band 7.5+',
    description: 'Từ vựng học thuật cao cấp cho bài viết Writing Task 2 & Reading.',
    color: 'rose',
    createdAt: Date.now() - 700000
  }
];

const DEFAULT_VOCABULARY_SEEDS = [
  {
    id: 'seed-1',
    deckId: 'deck-toeic',
    word: 'invest',
    phonetic: '/ɪnˈvest/',
    partOfSpeech: 'verb',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/invest-us.mp3',
    definitionEn: 'put money into financial schemes, shares, or property with the expectation of achieving a profit',
    vietnameseMeaning: 'đầu tư, góp vốn',
    exampleEn: 'Many young professionals invest in mutual funds for retirement.',
    exampleVi: 'Nhiều người đi làm trẻ tuổi đầu tư vào quỹ tương hỗ cho kế hoạch nghỉ hưu.',
    distractors: ['tiêu xài lãng phí', 'rút tiền tiết kiệm', 'vay nợ tiêu dùng'],
    level: 1,
    lastReviewedDate: '',
    nextReviewDate: SRSEngine.getTodayString(), // due today
    reviewCount: 0,
    mastered: false,
    createdAt: Date.now() - 500000
  },
  {
    id: 'seed-2',
    deckId: 'deck-toeic',
    word: 'profit',
    phonetic: '/ˈprɑː.fɪt/',
    partOfSpeech: 'noun',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/profit-us.mp3',
    definitionEn: 'a financial gain, especially the difference between the amount earned and the amount spent',
    vietnameseMeaning: 'lợi nhuận, tiền lãi',
    exampleEn: 'Net profit increased by fifteen percent this quarter.',
    exampleVi: 'Lợi nhuận ròng đã tăng mười lăm phần trăm trong quý này.',
    distractors: ['khoản lỗ lũy kế', 'khoản nợ đến hạn', 'thuế môn bài'],
    level: 2,
    lastReviewedDate: SRSEngine.addDays(SRSEngine.getTodayString(), -1),
    nextReviewDate: SRSEngine.getTodayString(), // due today
    reviewCount: 1,
    mastered: false,
    createdAt: Date.now() - 400000
  },
  {
    id: 'seed-3',
    deckId: 'deck-toeic',
    word: 'collaborate',
    phonetic: '/kəˈlæb.ə.reɪt/',
    partOfSpeech: 'verb',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/collaborate-us.mp3',
    definitionEn: 'work jointly on an activity or project to produce or create something',
    vietnameseMeaning: 'hợp tác, cộng tác',
    exampleEn: 'The marketing and sales teams collaborate closely on new campaigns.',
    exampleVi: 'Đội ngũ tiếp thị và bán hàng hợp tác chặt chẽ trong các chiến dịch mới.',
    distractors: ['cạnh tranh khốc liệt', 'trì hoãn tiến độ', 'tách riêng hoạt động'],
    level: 1,
    lastReviewedDate: '',
    nextReviewDate: SRSEngine.getTodayString(),
    reviewCount: 0,
    mastered: false,
    createdAt: Date.now() - 350000
  },
  {
    id: 'seed-4',
    deckId: 'deck-tech',
    word: 'algorithm',
    phonetic: '/ˈæl.ɡə.rɪ.ðəm/',
    partOfSpeech: 'noun',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/algorithm-us.mp3',
    definitionEn: 'a process or set of rules to be followed in calculations or other problem-solving operations',
    vietnameseMeaning: 'thuật toán',
    exampleEn: 'The recommendation algorithm personalizes content for every user.',
    exampleVi: 'Thuật toán đề xuất cá nhân hóa nội dung cho từng người dùng.',
    distractors: ['phần cứng máy chủ', 'giao diện người dùng', 'dữ liệu rác'],
    level: 3,
    lastReviewedDate: SRSEngine.addDays(SRSEngine.getTodayString(), -3),
    nextReviewDate: SRSEngine.getTodayString(),
    reviewCount: 2,
    mastered: false,
    createdAt: Date.now() - 300000
  },
  {
    id: 'seed-5',
    deckId: 'deck-tech',
    word: 'ubiquitous',
    phonetic: '/juːˈbɪk.wə.t̬əs/',
    partOfSpeech: 'adjective',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/ubiquitous-us.mp3',
    definitionEn: 'present, appearing, or found everywhere at the same time',
    vietnameseMeaning: 'phổ biến khắp nơi',
    exampleEn: 'Cloud computing has become ubiquitous across all software industries.',
    exampleVi: 'Điện toán đám mây đã trở nên phổ biến khắp nơi trong các ngành công nghiệp phần mềm.',
    distractors: ['hiếm có khó tìm', 'lỗi thời lạc hậu', 'hạn chế sử dụng'],
    level: 1,
    lastReviewedDate: '',
    nextReviewDate: SRSEngine.getTodayString(),
    reviewCount: 0,
    mastered: false,
    createdAt: Date.now() - 250000
  },
  {
    id: 'seed-6',
    deckId: 'deck-comm',
    word: 'resilient',
    phonetic: '/rɪˈzɪl.jənt/',
    partOfSpeech: 'adjective',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/resilient-us.mp3',
    definitionEn: 'able to withstand or recover quickly from difficult conditions',
    vietnameseMeaning: 'kiên cường, mau phục hồi',
    exampleEn: 'Staying positive in tough times shows you are mentally resilient.',
    exampleVi: 'Giữ thái độ tích cực trong giai đoạn khó khăn cho thấy bạn là người kiên cường.',
    distractors: ['dễ suy sụp', 'bảo thủ bi quan', 'thờ ơ lạnh lùng'],
    level: 4,
    lastReviewedDate: SRSEngine.addDays(SRSEngine.getTodayString(), -7),
    nextReviewDate: SRSEngine.getTodayString(),
    reviewCount: 3,
    mastered: false,
    createdAt: Date.now() - 200000
  },
  {
    id: 'seed-7',
    deckId: 'deck-ielts',
    word: 'serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.t̬i/',
    partOfSpeech: 'noun',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3',
    definitionEn: 'the occurrence and development of events by chance in a happy or beneficial way',
    vietnameseMeaning: 'sự may mắn tình cờ',
    exampleEn: 'Meeting her at the library was a moment of pure serendipity.',
    exampleVi: 'Gặp cô ấy tại thư viện quả thực là một khoảnh khắc may mắn tình cờ.',
    distractors: ['sự sắp đặt có chủ đích', 'nỗi thất vọng kéo dài', 'sự suy giảm thể lực'],
    level: 1,
    lastReviewedDate: '',
    nextReviewDate: SRSEngine.getTodayString(),
    reviewCount: 0,
    mastered: false,
    createdAt: Date.now() - 150000
  }
];

// ============================================================================
// 7. STORAGE MANAGER (LocalStorage + Full JSON Export / Import)
// ============================================================================
class StorageManager {
  static STORAGE_CARDS_KEY = 'vocabmaster_cards_srs_v3';
  static STORAGE_DECKS_KEY = 'vocabmaster_decks_srs_v3';

  static getDecks() {
    try {
      const data = localStorage.getItem(this.STORAGE_DECKS_KEY);
      if (!data) {
        this.saveDecks(DEFAULT_DECKS);
        return [...DEFAULT_DECKS];
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_DECKS];
    } catch (e) {
      return [...DEFAULT_DECKS];
    }
  }

  static saveDecks(decks) {
    try {
      localStorage.setItem(this.STORAGE_DECKS_KEY, JSON.stringify(decks));
    } catch (e) {}
  }

  static createDeck(name, description = '', color = 'indigo') {
    const decks = this.getDecks();
    const newDeck = {
      id: 'deck-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      description: description.trim(),
      color,
      createdAt: Date.now()
    };
    decks.push(newDeck);
    this.saveDecks(decks);
    return newDeck;
  }

  static updateDeck(id, fields) {
    const decks = this.getDecks();
    const idx = decks.findIndex(d => d.id === id);
    if (idx !== -1) {
      decks[idx] = { ...decks[idx], ...fields };
      this.saveDecks(decks);
      return decks[idx];
    }
    return null;
  }

  static deleteDeck(id) {
    let decks = this.getDecks();
    if (decks.length <= 1) {
      throw new Error('Bạn cần giữ lại ít nhất 1 bộ từ vựng.');
    }
    decks = decks.filter(d => d.id !== id);
    this.saveDecks(decks);

    const fallbackDeckId = decks[0].id;
    const cards = this.getCards();
    cards.forEach(c => {
      if (c.deckId === id) c.deckId = fallbackDeckId;
    });
    this.saveCards(cards);
    return decks;
  }

  static getCards() {
    try {
      const data = localStorage.getItem(this.STORAGE_CARDS_KEY);
      if (!data) {
        this.saveCards(DEFAULT_VOCABULARY_SEEDS);
        return [...DEFAULT_VOCABULARY_SEEDS];
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [...DEFAULT_VOCABULARY_SEEDS];
    } catch (e) {
      return [...DEFAULT_VOCABULARY_SEEDS];
    }
  }

  static saveCards(cards) {
    try {
      localStorage.setItem(this.STORAGE_CARDS_KEY, JSON.stringify(cards));
    } catch (e) {}
  }

  static addCard(card) {
    const cards = this.getCards();
    const decks = this.getDecks();
    const newCard = {
      id: 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      deckId: card.deckId || decks[0].id,
      createdAt: Date.now(),
      level: 1,
      lastReviewedDate: '',
      nextReviewDate: SRSEngine.getTodayString(),
      reviewCount: 0,
      consecutiveCorrect: 0,
      wrongCount: 0,
      mastered: false,
      ...card
    };
    cards.unshift(newCard);
    this.saveCards(cards);
    GamificationEngine.updateQuestProgress('quest-add', 1);
    return newCard;
  }

  static updateCard(id, fields) {
    const cards = this.getCards();
    const idx = cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      cards[idx] = { ...cards[idx], ...fields };
      this.saveCards(cards);
      return cards[idx];
    }
    return null;
  }

  static deleteCard(id) {
    const cards = this.getCards();
    const filtered = cards.filter(c => c.id !== id);
    this.saveCards(filtered);
    return filtered;
  }

  static resetSeeds() {
    this.saveDecks(DEFAULT_DECKS);
    this.saveCards(DEFAULT_VOCABULARY_SEEDS);
    return {
      decks: [...DEFAULT_DECKS],
      cards: [...DEFAULT_VOCABULARY_SEEDS]
    };
  }

  // Practice History Storage
  static STORAGE_HISTORY_KEY = 'vocabmaster_practice_history_v2';
  static STORAGE_MISTAKES_KEY = 'vocabmaster_mistakes_pool_v3';
  static STORAGE_DECK_SETTINGS_KEY = 'vocabmaster_deck_settings_v3';

  // --------------------------------------------------------------------------
  // Mistake Review Pool (Danh Sách Câu Chọn Sai Cần Ôn Lại)
  // --------------------------------------------------------------------------
  static getMistakeCardIds() {
    try {
      const data = localStorage.getItem(this.STORAGE_MISTAKES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const allCards = this.getCards();
          const validIds = new Set(allCards.map(c => c.id));
          return parsed.filter(id => validIds.has(id));
        }
      }
    } catch (e) {}

    // Tự động migration: Quét các thẻ có wrongCount > 0 và chưa thuộc để nạp vào Mistake Pool
    try {
      const allCards = this.getCards();
      const existingMistakes = allCards.filter(c => (c.wrongCount || 0) > 0 && !c.mastered).map(c => c.id);
      if (existingMistakes.length > 0) {
        this.saveMistakeCardIds(existingMistakes);
        return existingMistakes;
      }
    } catch (e) {}

    return [];
  }

  static saveMistakeCardIds(ids) {
    try {
      const uniqueIds = Array.from(new Set(ids));
      localStorage.setItem(this.STORAGE_MISTAKES_KEY, JSON.stringify(uniqueIds));
      return uniqueIds;
    } catch (e) {
      return ids;
    }
  }

  static addMistake(cardId) {
    if (!cardId) return [];
    const list = this.getMistakeCardIds();
    if (!list.includes(cardId)) {
      list.unshift(cardId); // ưu tiên câu vừa sai lên đầu
      this.saveMistakeCardIds(list);
    }
    // Cập nhật wrongCount trên card để SRS đồng bộ
    const card = this.getCards().find(c => c.id === cardId);
    if (card) {
      card.wrongCount = (card.wrongCount || 0) + 1;
      this.updateCard(cardId, { wrongCount: card.wrongCount });
    }
    return list;
  }

  static removeMistake(cardId) {
    if (!cardId) return [];
    const list = this.getMistakeCardIds();
    const updated = list.filter(id => id !== cardId);
    this.saveMistakeCardIds(updated);
    return updated;
  }

  static isMistake(cardId) {
    if (!cardId) return false;
    const list = this.getMistakeCardIds();
    return list.includes(cardId);
  }

  static clearMistakes() {
    localStorage.removeItem(this.STORAGE_MISTAKES_KEY);
  }

  // --------------------------------------------------------------------------
  // Deck Batch / Sub-deck Settings & Progress Reset
  // --------------------------------------------------------------------------
  static getDeckBatchSize(deckId) {
    try {
      const data = localStorage.getItem(this.STORAGE_DECK_SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed[deckId] && parsed[deckId].batchSize) {
          return parseInt(parsed[deckId].batchSize, 10);
        }
      }
    } catch (e) {}
    return 20; // mặc định 20 câu/phần
  }

  static setDeckBatchSize(deckId, size) {
    try {
      let settings = {};
      const data = localStorage.getItem(this.STORAGE_DECK_SETTINGS_KEY);
      if (data) settings = JSON.parse(data) || {};
      settings[deckId] = { ...(settings[deckId] || {}), batchSize: parseInt(size, 10) };
      localStorage.setItem(this.STORAGE_DECK_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  static resetDeckProgress(deckId) {
    const cards = this.getCards();
    const today = SRSEngine.getTodayString();
    let resetCount = 0;

    cards.forEach(c => {
      if (c.deckId === deckId) {
        c.level = 1;
        c.reviewCount = 0;
        c.wrongCount = 0;
        c.consecutiveCorrect = 0;
        c.mastered = false;
        c.lastReviewedDate = '';
        c.nextReviewDate = today;
        resetCount++;
        // Gỡ bỏ khỏi Mistake Pool nếu có
        this.removeMistake(c.id);
      }
    });

    this.saveCards(cards);
    return resetCount;
  }

  static getPracticeHistory() {
    try {
      const data = localStorage.getItem(this.STORAGE_HISTORY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {}
    return [];
  }

  static savePracticeHistory(history) {
    try {
      localStorage.setItem(this.STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {}
  }

  static addPracticeSession(session) {
    const history = this.getPracticeHistory();
    history.unshift(session);
    if (history.length > 50) history.length = 50; // keep last 50 sessions
    this.savePracticeHistory(history);
    return history;
  }

  static clearPracticeHistory() {
    localStorage.removeItem(this.STORAGE_HISTORY_KEY);
  }

  // Backup & Restore
  static exportDataAsJSON() {
    const data = {
      app: 'VocabMaster SRS',
      version: 4,
      exportDate: new Date().toISOString(),
      decks: this.getDecks(),
      cards: this.getCards(),
      mistakesPool: this.getMistakeCardIds(),
      deckSettings: (() => {
        try {
          return JSON.parse(localStorage.getItem(this.STORAGE_DECK_SETTINGS_KEY) || '{}');
        } catch (e) { return {}; }
      })(),
      expData: GamificationEngine.getExpData(),
      streakData: GamificationEngine.getStreakData(),
      questsData: GamificationEngine.getDailyQuests(),
      practiceHistory: this.getPracticeHistory()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabmaster_backup_${SRSEngine.getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static importDataFromJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || !Array.isArray(parsed.cards)) {
      throw new Error('Định dạng file sao lưu không hợp lệ.');
    }
    if (Array.isArray(parsed.decks) && parsed.decks.length > 0) {
      this.saveDecks(parsed.decks);
    }
    this.saveCards(parsed.cards);
    if (Array.isArray(parsed.mistakesPool)) {
      this.saveMistakeCardIds(parsed.mistakesPool);
    }
    if (parsed.deckSettings && typeof parsed.deckSettings === 'object') {
      localStorage.setItem(this.STORAGE_DECK_SETTINGS_KEY, JSON.stringify(parsed.deckSettings));
    }
    if (parsed.expData) GamificationEngine.saveExpData(parsed.expData);
    if (parsed.streakData) localStorage.setItem('vocabmaster_streak_data_v2', JSON.stringify(parsed.streakData));
    if (Array.isArray(parsed.questsData)) GamificationEngine.saveDailyQuests(parsed.questsData);
    if (Array.isArray(parsed.practiceHistory)) this.savePracticeHistory(parsed.practiceHistory);
    return parsed;
  }
}

// ============================================================================
// 8. VISUAL CONFETTI CANNON
// ============================================================================
class ConfettiCannon {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  fire(duration = 2000) {
    if (!this.canvas || !this.ctx) return;
    this.resize();

    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
    const count = 70;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: this.canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008
      });
    }

    if (!this.animId) {
      this.animate();
    }
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.animId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// ============================================================================
// 9. TOAST NOTIFICATION UTILITY
// ============================================================================
class Toast {
  static show(message, type = 'info', duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-3.5 px-4 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold pointer-events-auto transition-all animate-scaleUp border ${
      type === 'success'
        ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
        : type === 'error'
        ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
        : 'bg-slate-900 text-slate-100 border-slate-700 shadow-black/30'
    }`;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// ============================================================================
// 10. MAIN CONTROLLER & APPLICATION ENGINE
// ============================================================================
class VocabMasterApp {
  static getCardStatus(card) {
    if (!card) return 'unstudied';
    if (card.mastered || (card.level || 1) >= 6) return 'mastered';
    if ((card.reviewCount || 0) > 0) return 'reviewing';
    return 'unstudied';
  }

  constructor() {
    this.audio = new AudioEngine();
    this.confetti = new ConfettiCannon('confetti-canvas');

    this.allDecks = StorageManager.getDecks();
    this.allCards = StorageManager.getCards();
    this.filteredCards = [...this.allCards];

    this.currentIndex = 0;
    this.currentMode = 'flashcard'; // 'flashcard', 'choice', 'type-vi', 'type-en'
    this.studyDeckFilter = 'all';
    this.studyBatchIndex = 'all'; // 'all' hoặc số nguyên 0, 1, 2...
    this.studyBatchSize = 20;
    this.studyStatusFilter = 'all';

    this.consecutiveCorrectCount = 0;
    this.isCardFlipped = false;
    this.isAnswerLocked = false;
    this.choiceOptions = [];

    this.cacheDom();
    this.initTheme();
    this.bindEvents();
    this.init();
  }

  cacheDom() {
    // Header & Tabs
    this.navBrand = document.getElementById('nav-brand');
    this.tabStudy = document.getElementById('tab-btn-study');
    this.tabDecks = document.getElementById('tab-btn-decks');
    this.tabAdd = document.getElementById('tab-btn-add');
    this.tabManager = document.getElementById('tab-btn-manager');
    this.badgeDecksCount = document.getElementById('badge-decks-count');
    this.badgeTotalCount = document.getElementById('badge-total-count');

    // Header Right Gamification & Controls
    this.btnShowLevelInfo = document.getElementById('btn-show-level-info');
    this.headerUserLevel = document.getElementById('header-user-level');
    this.headerUserTitle = document.getElementById('header-user-title');
    this.headerExpText = document.getElementById('header-exp-text');
    this.headerExpBar = document.getElementById('header-exp-bar');
    this.statStreak = document.getElementById('stat-streak');
    this.btnOpenQuests = document.getElementById('btn-open-quests');
    this.questAlertBadge = document.getElementById('quest-alert-badge');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.iconSound = document.getElementById('icon-sound');
    this.btnToggleTheme = document.getElementById('btn-toggle-theme');

    // Views
    this.viewStudy = document.getElementById('view-study');
    this.viewDecks = document.getElementById('view-decks');
    this.viewAdd = document.getElementById('view-add');
    this.viewManager = document.getElementById('view-manager');

    // SRS Banner & Study Filter Controls
    this.bannerSrsDue = document.getElementById('banner-srs-due');
    this.badgeDueCount = document.getElementById('badge-due-count');
    this.btnFilterSrsDueNow = document.getElementById('btn-filter-srs-due-now');

    this.modeFlashcardBtn = document.getElementById('mode-flashcard-btn');
    this.modeChoiceBtn = document.getElementById('mode-choice-btn');
    this.modeTypeViBtn = document.getElementById('mode-type-vi-btn');
    this.modeTypeEnBtn = document.getElementById('mode-type-en-btn');

    this.studyDeckFilterSelect = document.getElementById('study-deck-filter');
    this.containerStudyBatchFilter = document.getElementById('container-study-batch-filter');
    this.studyBatchFilterSelect = document.getElementById('study-batch-filter');
    this.btnQuickMistakes = document.getElementById('btn-quick-mistakes');
    this.quickMistakesCount = document.getElementById('quick-mistakes-count');
    this.studyActiveScopeBanner = document.getElementById('study-active-scope-banner');
    this.studyScopeText = document.getElementById('study-scope-text');
    this.btnClearStudyScope = document.getElementById('btn-clear-study-scope');

    this.studyFilterSelect = document.getElementById('study-filter');
    this.studyLimitSelect = document.getElementById('study-limit-select');
    this.btnViewHistory = document.getElementById('btn-view-history');
    this.studyProgressIndicator = document.getElementById('study-progress-indicator');
    this.studyProgressBar = document.getElementById('study-progress-bar');
    this.btnShuffle = document.getElementById('btn-shuffle-deck');

    this.studyCardWrapper = document.getElementById('study-card-wrapper');
    this.studyEmptyState = document.getElementById('study-empty-state');
    this.btnEmptyResetFilter = document.getElementById('btn-empty-reset-filter');
    this.btnEmptyAddWord = document.getElementById('btn-empty-add-word');

    // Mode 0: Flashcard 3D
    this.containerModeFlashcard = document.getElementById('container-mode-flashcard');
    this.flashcard3D = document.getElementById('flashcard-3d');
    this.fcFrontDeckBadge = document.getElementById('fc-front-deck-badge');
    this.fcFrontPosBadge = document.getElementById('fc-front-pos-badge');
    this.fcFrontSrsBadge = document.getElementById('fc-front-srs-badge');
    this.btnFcAudioFront = document.getElementById('btn-fc-audio-front');
    this.fcFrontWord = document.getElementById('fc-front-word');
    this.fcFrontPhonetic = document.getElementById('fc-front-phonetic');

    this.fcBackWordMini = document.getElementById('fc-back-word-mini');
    this.fcBackPos = document.getElementById('fc-back-pos');
    this.btnFcAudioBack = document.getElementById('btn-fc-audio-back');
    this.fcBackMeaning = document.getElementById('fc-back-meaning');
    this.fcBackExampleEn = document.getElementById('fc-back-example-en');
    this.fcBackExampleVi = document.getElementById('fc-back-example-vi');
    this.fcBackSrsInfo = document.getElementById('fc-back-srs-info');
    this.fcBackReviewCount = document.getElementById('fc-back-review-count');

    this.btnSrsFail = document.getElementById('btn-srs-fail');
    this.btnSrsPass = document.getElementById('btn-srs-pass');
    this.btnSrsMastered = document.getElementById('btn-srs-mastered');

    // Mode 1: Multiple Choice
    this.containerModeChoice = document.getElementById('container-mode-choice');
    this.choiceDeckBadge = document.getElementById('choice-deck-badge');
    this.choicePosBadge = document.getElementById('choice-pos-badge');
    this.btnChoiceAudio = document.getElementById('btn-choice-audio');
    this.choicePrimaryWord = document.getElementById('choice-primary-word');
    this.choicePhonetic = document.getElementById('choice-phonetic');
    this.choiceOptionsGrid = document.getElementById('choice-options-grid');
    this.choiceFeedbackBox = document.getElementById('choice-feedback-box');
    this.choiceExampleEn = document.getElementById('choice-example-en');
    this.choiceExampleVi = document.getElementById('choice-example-vi');
    this.btnChoiceManualNext = document.getElementById('btn-choice-manual-next');

    // Mode 2: Look English -> Type Vietnamese
    this.containerModeTypeVi = document.getElementById('container-mode-type-vi');
    this.typeViDeckBadge = document.getElementById('type-vi-deck-badge');
    this.typeViPosBadge = document.getElementById('type-vi-pos-badge');
    this.btnTypeViAudio = document.getElementById('btn-type-vi-audio');
    this.typeViWord = document.getElementById('type-vi-word');
    this.typeViPhonetic = document.getElementById('type-vi-phonetic');
    this.btnToggleHintVi = document.getElementById('btn-toggle-hint-vi');
    this.labelToggleHintVi = document.getElementById('label-toggle-hint-vi');
    this.boxHintMaskedVi = document.getElementById('box-hint-masked-vi');
    this.hintMaskedSentenceVi = document.getElementById('hint-masked-sentence-vi');
    this.formTypeMeaningVi = document.getElementById('form-type-meaning-vi');
    this.inputTypeMeaningVi = document.getElementById('input-type-meaning-vi');
    this.typeViFeedbackBox = document.getElementById('type-vi-feedback-box');
    this.typeViFeedbackIcon = document.getElementById('type-vi-feedback-icon');
    this.typeViFeedbackTitle = document.getElementById('type-vi-feedback-title');
    this.typeViMatchScore = document.getElementById('type-vi-match-score');
    this.typeViExpected = document.getElementById('type-vi-expected');
    this.typeViExampleEn = document.getElementById('type-vi-example-en');
    this.typeViExampleVi = document.getElementById('type-vi-example-vi');
    this.btnTypeViNext = document.getElementById('btn-type-vi-next');

    // Mode 3: Look Vietnamese -> Type English
    this.containerModeTypeEn = document.getElementById('container-mode-type-en');
    this.typeEnDeckBadge = document.getElementById('type-en-deck-badge');
    this.typeEnPosBadge = document.getElementById('type-en-pos-badge');
    this.typeEnMeaningTitle = document.getElementById('type-en-meaning-title');
    this.typeEnExampleViPreview = document.getElementById('type-en-example-vi-preview');
    this.btnToggleHintEn = document.getElementById('btn-toggle-hint-en');
    this.labelToggleHintEn = document.getElementById('label-toggle-hint-en');
    this.boxHintMaskedEn = document.getElementById('box-hint-masked-en');
    this.formTypeEn = document.getElementById('form-type-en');
    this.inputTypeEnWord = document.getElementById('input-type-en-word');
    this.typeEnFeedbackBox = document.getElementById('type-en-feedback-box');
    this.typeEnFeedbackIcon = document.getElementById('type-en-feedback-icon');
    this.typeEnFeedbackTitle = document.getElementById('type-en-feedback-title');
    this.typeEnExpectedWord = document.getElementById('type-en-expected-word');
    this.btnTypeEnHear = document.getElementById('btn-type-en-hear');
    this.typeEnExampleEn = document.getElementById('type-en-example-en');
    this.btnTypeEnNext = document.getElementById('btn-type-en-next');

    // Bottom Navigation Buttons
    this.btnPrevCard = document.getElementById('btn-prev-card');
    this.btnNextCard = document.getElementById('btn-next-card');

    // View 2: Decks
    this.btnOpenCreateDeckModal = document.getElementById('btn-open-create-deck-modal');
    this.decksGrid = document.getElementById('decks-grid');

    // View 3: Add
    this.subtabAddSingle = document.getElementById('subtab-add-single');
    this.subtabAddBulk = document.getElementById('subtab-add-bulk');
    this.panelAddSingle = document.getElementById('panel-add-single');
    this.panelAddBulk = document.getElementById('panel-add-bulk');
    this.formLookupWord = document.getElementById('form-lookup-word');
    this.inputLookupWord = document.getElementById('input-lookup-word');
    this.addWordDeckSelect = document.getElementById('add-word-deck-select');
    this.btnTriggerLookup = document.getElementById('btn-trigger-lookup');
    this.lookupLoading = document.getElementById('lookup-loading');
    this.lookupResultCard = document.getElementById('lookup-result-card');
    this.editWord = document.getElementById('edit-word');
    this.editPhonetic = document.getElementById('edit-phonetic');
    this.editPartOfSpeech = document.getElementById('edit-part-of-speech');
    this.editMeaning = document.getElementById('edit-meaning');
    this.editExampleEn = document.getElementById('edit-example-en');
    this.editExampleVi = document.getElementById('edit-example-vi');
    this.editDistractor1 = document.getElementById('edit-distractor-1');
    this.editDistractor2 = document.getElementById('edit-distractor-2');
    this.editDistractor3 = document.getElementById('edit-distractor-3');
    this.editAudioUrl = document.getElementById('edit-audio-url');
    this.btnPreviewAudio = document.getElementById('btn-preview-audio');
    this.btnRegenDistractors = document.getElementById('btn-regen-distractors');
    this.btnCancelSave = document.getElementById('btn-cancel-save');
    this.btnConfirmSaveCard = document.getElementById('btn-confirm-save-card');

    // AI Bulk import
    this.bulkAddDeckSelect = document.getElementById('bulk-add-deck-select');
    this.dropzoneBulk = document.getElementById('dropzone-bulk');
    this.inputBulkFile = document.getElementById('input-bulk-file');
    this.bulkSelectedFilename = document.getElementById('bulk-selected-filename');
    this.textareaBulkWords = document.getElementById('textarea-bulk-words');
    this.btnStartBulkAi = document.getElementById('btn-start-bulk-ai');
    this.bulkProgressContainer = document.getElementById('bulk-progress-container');
    this.bulkProgressStatus = document.getElementById('bulk-progress-status');
    this.bulkProgressPct = document.getElementById('bulk-progress-pct');
    this.bulkProgressBarFill = document.getElementById('bulk-progress-bar-fill');
    this.bulkResultsContainer = document.getElementById('bulk-results-container');
    this.bulkCountBadge = document.getElementById('bulk-count-badge');
    this.bulkCardsList = document.getElementById('bulk-cards-list');
    this.btnConfirmSaveBulk = document.getElementById('btn-confirm-save-bulk');

    // View 4: Manager
    this.managerSearch = document.getElementById('manager-search');
    this.managerDeckFilter = document.getElementById('manager-deck-filter');
    this.countMgrAll = document.getElementById('count-mgr-all');
    this.countMgrDue = document.getElementById('count-mgr-due');
    this.countMgrLearning = document.getElementById('count-mgr-learning');
    this.countMgrMastered = document.getElementById('count-mgr-mastered');
    this.managerCardsGrid = document.getElementById('manager-cards-grid');
    this.managerEmpty = document.getElementById('manager-empty');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.inputImportJson = document.getElementById('input-import-json');
    this.btnResetSeeds = document.getElementById('btn-reset-seeds');

    // Modals
    this.modalEditCard = document.getElementById('modal-edit-card');
    this.btnCloseEditModal = document.getElementById('btn-close-edit-modal');
    this.btnModalCancel = document.getElementById('btn-modal-cancel');
    this.formModalEdit = document.getElementById('form-modal-edit');
    this.modalCardId = document.getElementById('modal-card-id');
    this.modalDeckSelect = document.getElementById('modal-deck-select');
    this.modalSrsLevel = document.getElementById('modal-srs-level');
    this.modalWord = document.getElementById('modal-word');
    this.modalPhonetic = document.getElementById('modal-phonetic');
    this.modalMeaning = document.getElementById('modal-meaning');
    this.modalExampleEn = document.getElementById('modal-example-en');
    this.modalExampleVi = document.getElementById('modal-example-vi');

    this.modalDeck = document.getElementById('modal-deck');
    this.modalDeckTitle = document.getElementById('modal-deck-title');
    this.btnCloseDeckModal = document.getElementById('btn-close-deck-modal');
    this.btnCancelDeckModal = document.getElementById('btn-cancel-deck-modal');
    this.formModalDeck = document.getElementById('form-modal-deck');
    this.modalDeckId = document.getElementById('modal-deck-id');
    this.modalDeckName = document.getElementById('modal-deck-name');
    this.modalDeckDesc = document.getElementById('modal-deck-desc');

    this.modalQuests = document.getElementById('modal-quests');
    this.btnCloseQuestsModal = document.getElementById('btn-close-quests-modal');
    this.btnCloseQuestsOk = document.getElementById('btn-close-quests-ok');
    this.questsList = document.getElementById('quests-list');

    this.modalLevelup = document.getElementById('modal-levelup');
    this.modalLevelupTitle = document.getElementById('modal-levelup-title');
    this.btnCloseLevelup = document.getElementById('btn-close-levelup');

    // Modal 5: Practice Session Summary
    this.modalSessionSummary = document.getElementById('modal-session-summary');
    this.summarySessionSubtitle = document.getElementById('summary-session-subtitle');
    this.summaryStatTotal = document.getElementById('summary-stat-total');
    this.summaryStatCorrect = document.getElementById('summary-stat-correct');
    this.summaryStatWrong = document.getElementById('summary-stat-wrong');
    this.summaryStatAccuracy = document.getElementById('summary-stat-accuracy');
    this.summaryMasteredBox = document.getElementById('summary-mastered-box');
    this.summaryMasteredList = document.getElementById('summary-mastered-list');
    this.btnConfirmAllMastered = document.getElementById('btn-confirm-all-mastered');
    this.summaryMistakesBox = document.getElementById('summary-mistakes-box');
    this.summaryMistakesCount = document.getElementById('summary-mistakes-count');
    this.summaryMistakesList = document.getElementById('summary-mistakes-list');
    this.btnRetryMistakesNow = document.getElementById('btn-retry-mistakes-now');
    this.btnToggleSummaryCorrect = document.getElementById('btn-toggle-summary-correct');
    this.summaryCorrectCount = document.getElementById('summary-correct-count');
    this.summaryCorrectList = document.getElementById('summary-correct-list');
    this.iconSummaryCorrectToggle = document.getElementById('icon-summary-correct-toggle');
    this.btnCloseSummary = document.getElementById('btn-close-summary');
    this.btnNextSession = document.getElementById('btn-next-session');
    this.btnSummaryOpenHistory = document.getElementById('btn-summary-open-history');

    // Modal 6: Practice History
    this.modalHistory = document.getElementById('modal-history');
    this.historySessionsList = document.getElementById('history-sessions-list');
    this.btnCloseHistory = document.getElementById('btn-close-history');
    this.btnCloseHistoryOk = document.getElementById('btn-close-history-ok');
    this.btnClearHistory = document.getElementById('btn-clear-history');

    // Manager View Mistakes Filter Count
    this.countMgrMistakes = document.getElementById('count-mgr-mistakes');

    // ========================================================================
    // Interactive Learning Session DOM Elements
    // ========================================================================
    this.tabInteractive = document.getElementById('tab-btn-interactive');
    this.viewInteractive = document.getElementById('view-interactive');
    this.btnStartInteractiveFromStudy = document.getElementById('btn-start-interactive-from-study');

    // Screen 1: Setup
    this.interactiveSetupScreen = document.getElementById('interactive-setup-screen');
    this.btnInteractiveSetupBack = document.getElementById('btn-interactive-setup-back');
    this.interactiveDeckSelect = document.getElementById('interactive-deck-select');
    this.tabSourceSrs = document.getElementById('tab-source-srs');
    this.tabSourceCustom = document.getElementById('tab-source-custom');
    this.badgeInteractiveDueCount = document.getElementById('badge-interactive-due-count');
    this.btnToggleAllSrsLevels = document.getElementById('btn-toggle-all-srs-levels');
    this.chkSrsLevels = [1, 2, 3, 4, 5].map(lvl => document.getElementById('chk-srs-' + lvl));
    this.countSrsLevels = [1, 2, 3, 4, 5].map(lvl => document.getElementById('count-srs-' + lvl));
    this.interactiveQuestionTypeGrid = document.getElementById('interactive-question-type-grid');
    this.interactiveQuestionTypeCards = document.querySelectorAll('#interactive-question-type-grid .qtype-card');
    this.interactiveSessionLimit = document.getElementById('interactive-session-limit');
    this.chkInteractiveAutoPlayAfter = document.getElementById('chk-interactive-auto-play-after');
    this.chkInteractiveContinuousMode = document.getElementById('chk-interactive-continuous-mode');
    this.interactivePreviewCountText = document.getElementById('interactive-preview-count-text');
    this.btnStartInteractiveSession = document.getElementById('btn-start-interactive-session');

    // Screen 2: Active Session
    this.interactiveActiveScreen = document.getElementById('interactive-active-screen');
    this.interactiveQuestionCounter = document.getElementById('interactive-question-counter');
    this.interactiveMasteryScore = document.getElementById('interactive-mastery-score');
    this.interactiveMasteryDot = document.getElementById('interactive-mastery-dot');
    this.interactiveMasteryText = document.getElementById('interactive-mastery-text');
    this.interactiveCountdownTimer = document.getElementById('interactive-countdown-timer');
    this.interactiveTimerText = document.getElementById('interactive-timer-text');
    this.btnInteractiveQuit = document.getElementById('btn-interactive-quit');
    this.btnInteractiveFullscreen = document.getElementById('btn-interactive-fullscreen');
    this.iconInteractiveFullscreen = document.getElementById('icon-interactive-fullscreen');
    this.interactiveProgressPct = document.getElementById('interactive-progress-pct');
    this.interactiveProgressBar = document.getElementById('interactive-progress-bar');
    this.interactiveQuestionTypeBadge = document.getElementById('interactive-question-type-badge');
    this.interactiveDeckBadge = document.getElementById('interactive-deck-badge');
    this.btnInteractivePlayWord = document.getElementById('btn-interactive-play-word');
    this.btnInteractivePlayExample = document.getElementById('btn-interactive-play-example');
    this.interactiveInputAnswer = document.getElementById('interactive-input-answer');
    this.btnInteractiveMic = document.getElementById('btn-interactive-mic');
    this.chkInteractiveLengthHint = document.getElementById('chk-interactive-length-hint');
    this.interactiveLengthHintBox = document.getElementById('interactive-length-hint-box');
    this.interactiveSubmitControls = document.getElementById('interactive-submit-controls');
    this.btnInteractiveGiveUp = document.getElementById('btn-interactive-give-up');
    this.btnInteractiveSubmit = document.getElementById('btn-interactive-submit');
    this.interactiveFeedbackContainer = document.getElementById('interactive-feedback-container');
    this.interactiveCorrectBanner = document.getElementById('interactive-correct-banner');
    this.interactiveWrongBanner = document.getElementById('interactive-wrong-banner');
    this.interactiveWrongTitle = document.getElementById('interactive-wrong-title');
    this.interactiveCharDiffBox = document.getElementById('interactive-char-diff-box');
    this.interactiveDiffUser = document.getElementById('interactive-diff-user');
    this.interactiveDiffTarget = document.getElementById('interactive-diff-target');
    this.interactiveForceRetypeBox = document.getElementById('interactive-force-retype-box');
    this.inputForceRetype = document.getElementById('input-force-retype');
    this.btnConfirmRetype = document.getElementById('btn-confirm-retype');
    this.forceRetypeError = document.getElementById('force-retype-error');
    this.btnInteractiveNextWord = document.getElementById('btn-interactive-next-word');
    this.btnInteractiveLearnLater = document.getElementById('btn-interactive-learn-later');
    this.btnInteractiveEditMeaning = document.getElementById('btn-interactive-edit-meaning');
    this.btnInteractivePassiveMode = document.getElementById('btn-interactive-passive-mode');
    this.btnInteractiveReport = document.getElementById('btn-interactive-report');
    this.chkInteractiveAutoPlayLive = document.getElementById('chk-interactive-auto-play-live');
    this.interactiveTipBox = document.getElementById('interactive-tip-box');
    this.interactiveTipText = document.getElementById('interactive-tip-text');

    // Right Column Elements
    this.interactiveRightListeningWaiting = document.getElementById('interactive-right-listening-waiting');
    this.interactiveRightDefinitionPreview = document.getElementById('interactive-right-definition-preview');
    this.previewPartOfSpeech = document.getElementById('preview-part-of-speech');
    this.previewDefinitionEn = document.getElementById('preview-definition-en');
    this.previewMeaningVi = document.getElementById('preview-meaning-vi');
    this.interactiveRightKnowledgeFull = document.getElementById('interactive-right-knowledge-full');
    this.fullWordTitle = document.getElementById('full-word-title');
    this.fullPosBadge = document.getElementById('full-pos-badge');
    this.fullPhoneticText = document.getElementById('full-phonetic-text');
    this.btnFullAudioRound = document.getElementById('btn-full-audio-round');
    this.btnAnalyzeDefinition = document.getElementById('btn-analyze-definition');
    this.fullDefinitionEnContent = document.getElementById('full-definition-en-content');
    this.btnAnalyzeMeaning = document.getElementById('btn-analyze-meaning');
    this.fullMeaningViContent = document.getElementById('full-meaning-vi-content');
    this.fullExamplesList = document.getElementById('full-examples-list');

    // Modal Summary Elements
    this.modalInteractiveSummary = document.getElementById('modal-interactive-summary');
    this.intSumTotal = document.getElementById('int-sum-total');
    this.intSumCorrect = document.getElementById('int-sum-correct');
    this.intSumWrong = document.getElementById('int-sum-wrong');
    this.intSumExp = document.getElementById('int-sum-exp');
    this.intSumAccuracy = document.getElementById('int-sum-accuracy');
    this.intSumAccuracyBar = document.getElementById('int-sum-accuracy-bar');
    this.intSumMistakesBox = document.getElementById('int-sum-mistakes-box');
    this.intSumMistakesCount = document.getElementById('int-sum-mistakes-count');
    this.intSumMistakesList = document.getElementById('int-sum-mistakes-list');
    this.btnIntSumRetryMistakes = document.getElementById('btn-int-sum-retry-mistakes');
    this.btnIntSumClose = document.getElementById('btn-int-sum-close');
    this.btnIntSumNext = document.getElementById('btn-int-sum-next');

    // State Variables for Interactive Session
    this.interactiveSource = 'srs'; // 'srs' | 'custom'
    this.interactiveQuestionType = 'both'; // 'both' | 'shuffle' | 'listen' | 'definition'
    this.interactiveSessionQueue = [];
    this.currentInteractiveIndex = 0;
    this.interactiveTimerInterval = null;
    this.interactiveTimerRemaining = 28;
    this.interactiveIsAnswerLocked = false;
    this.interactiveSessionStats = { total: 0, correct: 0, wrong: 0, mistakes: [], exp: 0 };
    this.speechRecognition = null;
    this.isRecordingSpeech = false;

    // Session Tracking State
    this.currentSessionResults = [];
    this.pendingMasteredCandidates = [];
    this.pendingWrongItems = [];
  }

  initTheme() {
    const savedTheme = localStorage.getItem('vocabmaster_theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vocabmaster_theme', 'light');
      Toast.show('Đã chuyển sang giao diện Sáng', 'info', 1500);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vocabmaster_theme', 'dark');
      Toast.show('Đã chuyển sang giao diện Tối', 'info', 1500);
    }
    if (window.lucide) lucide.createIcons();
  }

  bindEvents() {
    // Nav tabs
    this.navBrand.addEventListener('click', () => this.switchTab('study'));
    this.tabStudy.addEventListener('click', () => this.switchTab('study'));
    this.tabDecks.addEventListener('click', () => this.switchTab('decks'));
    this.tabAdd.addEventListener('click', () => this.switchTab('add'));
    this.tabManager.addEventListener('click', () => this.switchTab('manager'));
    if (this.tabInteractive) {
      this.tabInteractive.addEventListener('click', () => this.switchTab('interactive'));
    }
    if (this.btnStartInteractiveFromStudy) {
      this.btnStartInteractiveFromStudy.addEventListener('click', () => this.switchTab('interactive'));
    }
    if (this.btnInteractiveSetupBack) {
      this.btnInteractiveSetupBack.addEventListener('click', () => this.switchTab('study'));
    }
    this.btnEmptyAddWord.addEventListener('click', () => this.switchTab('add'));
    this.btnEmptyResetFilter.addEventListener('click', () => {
      this.studyFilterSelect.value = 'all';
      this.studyDeckFilterSelect.value = 'all';
      this.studyFilter = 'all';
      this.studyDeckFilter = 'all';
      this.applyStudyFilter();
    });

    // Theme & Sound
    this.btnToggleTheme.addEventListener('click', () => this.toggleTheme());
    this.btnToggleSound.addEventListener('click', () => {
      const enabled = this.audio.toggleSound();
      this.iconSound.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
      if (window.lucide) lucide.createIcons();
      Toast.show(enabled ? 'Đã bật âm thanh hiệu ứng' : 'Đã tắt âm thanh hiệu ứng', 'info', 1500);
    });

    // Quests & Level info
    this.btnOpenQuests.addEventListener('click', () => this.openQuestsModal());
    this.btnShowLevelInfo.addEventListener('click', () => this.openQuestsModal());
    this.btnCloseQuestsModal.addEventListener('click', () => this.closeQuestsModal());
    this.btnCloseQuestsOk.addEventListener('click', () => this.closeQuestsModal());
    this.btnCloseLevelup.addEventListener('click', () => {
      this.modalLevelup.classList.add('hidden');
      this.modalLevelup.classList.remove('flex');
    });

    // SRS Banner 1-click
    this.btnFilterSrsDueNow.addEventListener('click', () => {
      this.studyFilterSelect.value = 'due';
      this.applyStudyFilter();
    });

    // Study Modes
    this.modeFlashcardBtn.addEventListener('click', () => this.setStudyMode('flashcard'));
    this.modeChoiceBtn.addEventListener('click', () => this.setStudyMode('choice'));
    this.modeTypeViBtn.addEventListener('click', () => this.setStudyMode('type-vi'));
    this.modeTypeEnBtn.addEventListener('click', () => this.setStudyMode('type-en'));

    // Filters
    this.studyDeckFilterSelect.addEventListener('change', (e) => {
      this.studyDeckFilter = e.target.value;
      this.studyBatchIndex = 'all'; // Reset về toàn bộ khi đổi bộ từ
      this.applyStudyFilter();
    });
    if (this.studyBatchFilterSelect) {
      this.studyBatchFilterSelect.addEventListener('change', (e) => {
        this.studyBatchIndex = e.target.value;
        this.applyStudyFilter();
      });
    }
    if (this.btnQuickMistakes) {
      this.btnQuickMistakes.addEventListener('click', () => this.openMistakesReviewMode());
    }
    if (this.btnClearStudyScope) {
      this.btnClearStudyScope.addEventListener('click', () => {
        this.studyBatchIndex = 'all';
        this.studyStatusFilter = 'all';
        if (this.studyFilterSelect) this.studyFilterSelect.value = 'all';
        this.applyStudyFilter();
      });
    }
    this.studyFilterSelect.addEventListener('change', (e) => {
      this.studyStatusFilter = e.target.value;
      this.applyStudyFilter();
    });
    if (this.studyLimitSelect) {
      this.studyLimitSelect.addEventListener('change', () => this.applyStudyFilter());
    }
    this.btnShuffle.addEventListener('click', () => this.shuffleCards());

    // Navigation buttons
    this.btnPrevCard.addEventListener('click', () => this.prevCard());
    this.btnNextCard.addEventListener('click', () => this.nextCard());

    // Flashcard 3D Interactions
    this.flashcard3D.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // ignore buttons
      this.flipFlashcard();
    });
    this.btnFcAudioFront.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playCurrentAudio();
    });
    this.btnFcAudioBack.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playCurrentAudio();
    });
    this.btnSrsFail.addEventListener('click', () => this.handleSrsReview(false));
    this.btnSrsPass.addEventListener('click', () => this.handleSrsReview(true));
    if (this.btnSrsMastered) {
      this.btnSrsMastered.addEventListener('click', () => this.handleMarkAsMastered());
    }

    // Mode 1: Multiple choice
    this.btnChoiceAudio.addEventListener('click', () => this.playCurrentAudio());
    this.btnChoiceManualNext.addEventListener('click', () => this.nextCard());

    // Mode 2: Look EN -> Type VI
    this.btnTypeViAudio.addEventListener('click', () => this.playCurrentAudio());
    this.btnToggleHintVi.addEventListener('click', () => this.toggleHintVi());
    this.formTypeMeaningVi.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleTypeViSubmit();
    });
    this.btnTypeViNext.addEventListener('click', () => this.nextCard());

    // Mode 3: Look VI -> Type EN
    this.btnToggleHintEn.addEventListener('click', () => this.toggleHintEn());
    this.formTypeEn.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleTypeEnSubmit();
    });
    this.btnTypeEnHear.addEventListener('click', () => this.playCurrentAudio());
    this.btnTypeEnNext.addEventListener('click', () => this.nextCard());

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));

    // View 2: Decks
    this.btnOpenCreateDeckModal.addEventListener('click', () => this.openDeckModal());
    this.btnCloseDeckModal.addEventListener('click', () => this.closeDeckModal());
    this.btnCancelDeckModal.addEventListener('click', () => this.closeDeckModal());
    this.formModalDeck.addEventListener('submit', (e) => this.handleSaveDeck(e));

    // View 3: Add Single & Bulk
    this.subtabAddSingle.addEventListener('click', () => this.switchAddSubtab('single'));
    this.subtabAddBulk.addEventListener('click', () => this.switchAddSubtab('bulk'));
    this.formLookupWord.addEventListener('submit', (e) => this.handleWordLookup(e));
    this.btnPreviewAudio.addEventListener('click', () => {
      const word = this.editWord.value.trim();
      const url = this.editAudioUrl.value.trim();
      this.audio.playWordPronunciation(word, url);
    });
    this.btnRegenDistractors.addEventListener('click', () => {
      const meaning = this.editMeaning.value.trim();
      const dist = DictionaryService.generateDistractors(meaning);
      this.editDistractor1.value = dist[0] || '';
      this.editDistractor2.value = dist[1] || '';
      this.editDistractor3.value = dist[2] || '';
    });
    this.btnCancelSave.addEventListener('click', () => {
      this.lookupResultCard.classList.add('hidden');
      this.inputLookupWord.value = '';
    });
    this.btnConfirmSaveCard.addEventListener('click', () => this.saveNewCardFromLookup());

    // AI Bulk Import Events
    this.dropzoneBulk.addEventListener('click', () => this.inputBulkFile.click());
    this.inputBulkFile.addEventListener('change', (e) => this.handleBulkFileSelected(e));
    this.btnStartBulkAi.addEventListener('click', () => this.handleStartBulkImport());
    this.btnConfirmSaveBulk.addEventListener('click', () => this.saveBulkCards());

    // View 4: Manager
    this.managerSearch.addEventListener('input', () => this.renderManagerCards());
    this.managerDeckFilter.addEventListener('change', () => this.renderManagerCards());
    document.querySelectorAll('.mgr-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mgr-filter').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderManagerCards();
      });
    });

    // Backup & Restore
    this.btnExportJson.addEventListener('click', () => StorageManager.exportDataAsJSON());
    this.inputImportJson.addEventListener('change', (e) => this.handleImportJson(e));
    this.btnResetSeeds.addEventListener('click', () => {
      if (confirm('Khôi phục danh sách từ vựng & bộ sưu tập mẫu ban đầu?')) {
        StorageManager.resetSeeds();
        this.refreshAllData();
        Toast.show('Đã khôi phục dữ liệu mẫu', 'success');
      }
    });

    // Edit Modal
    this.btnCloseEditModal.addEventListener('click', () => this.closeEditModal());
    this.btnModalCancel.addEventListener('click', () => this.closeEditModal());
    this.formModalEdit.addEventListener('submit', (e) => this.handleSaveEditCard(e));

    // Session Summary & Mistakes Modal Controls
    if (this.btnRetryMistakesNow) {
      this.btnRetryMistakesNow.addEventListener('click', () => {
        if (this.modalSessionSummary) {
          this.modalSessionSummary.classList.add('hidden');
          this.modalSessionSummary.classList.remove('flex');
        }
        this.openMistakesReviewMode();
      });
    }
    if (this.btnCloseSummary) {
      this.btnCloseSummary.addEventListener('click', () => {
        if (this.modalSessionSummary) {
          this.modalSessionSummary.classList.add('hidden');
          this.modalSessionSummary.classList.remove('flex');
        }
      });
    }
    if (this.btnNextSession) {
      this.btnNextSession.addEventListener('click', () => {
        if (this.modalSessionSummary) {
          this.modalSessionSummary.classList.add('hidden');
          this.modalSessionSummary.classList.remove('flex');
        }
        this.applyStudyFilter();
      });
    }
    if (this.btnSummaryOpenHistory) {
      this.btnSummaryOpenHistory.addEventListener('click', () => {
        if (this.modalSessionSummary) {
          this.modalSessionSummary.classList.add('hidden');
          this.modalSessionSummary.classList.remove('flex');
        }
        this.openHistoryModal();
      });
    }

    // Practice History Modal Controls
    if (this.btnViewHistory) {
      this.btnViewHistory.addEventListener('click', () => this.openHistoryModal());
    }
    if (this.btnCloseHistory) {
      this.btnCloseHistory.addEventListener('click', () => this.closeHistoryModal());
    }
    if (this.btnCloseHistoryOk) {
      this.btnCloseHistoryOk.addEventListener('click', () => this.closeHistoryModal());
    }
    if (this.btnClearHistory) {
      this.btnClearHistory.addEventListener('click', () => {
        if (confirm('Xóa toàn bộ lịch sử các phiên luyện tập?')) {
          StorageManager.clearPracticeHistory();
          this.renderHistoryModal();
          Toast.show('Đã xóa lịch sử luyện tập', 'info');
        }
      });
    }

    // ========================================================================
    // Interactive Learning Session Listeners
    // ========================================================================
    if (this.tabSourceSrs) {
      this.tabSourceSrs.addEventListener('click', () => this.setInteractiveSource('srs'));
    }
    if (this.tabSourceCustom) {
      this.tabSourceCustom.addEventListener('click', () => this.setInteractiveSource('custom'));
    }
    if (this.interactiveDeckSelect) {
      this.interactiveDeckSelect.addEventListener('change', () => this.updateInteractiveSetupPreview());
    }
    if (this.btnToggleAllSrsLevels) {
      this.btnToggleAllSrsLevels.addEventListener('click', () => this.toggleAllSrsLevels());
    }
    this.chkSrsLevels.forEach(chk => {
      if (chk) chk.addEventListener('change', () => this.updateInteractiveSetupPreview());
    });
    this.interactiveQuestionTypeCards.forEach(card => {
      card.addEventListener('click', () => {
        const qType = card.dataset.qtype;
        this.setInteractiveQuestionType(qType);
      });
    });
    if (this.interactiveSessionLimit) {
      this.interactiveSessionLimit.addEventListener('change', () => this.updateInteractiveSetupPreview());
    }
    if (this.btnStartInteractiveSession) {
      this.btnStartInteractiveSession.addEventListener('click', () => this.startInteractiveSession());
    }

    // Active session controls
    if (this.btnInteractiveQuit) {
      this.btnInteractiveQuit.addEventListener('click', () => this.quitInteractiveSession());
    }
    if (this.btnInteractiveFullscreen) {
      this.btnInteractiveFullscreen.addEventListener('click', () => this.toggleFullscreenMode());
    }
    document.addEventListener('fullscreenchange', () => {
      if (this.iconInteractiveFullscreen) {
        this.iconInteractiveFullscreen.setAttribute('data-lucide', document.fullscreenElement ? 'minimize' : 'maximize');
        if (window.lucide) lucide.createIcons();
      }
    });

    if (this.btnInteractivePlayWord) {
      this.btnInteractivePlayWord.addEventListener('click', () => this.playInteractiveCurrentWord());
    }
    if (this.btnInteractivePlayExample) {
      this.btnInteractivePlayExample.addEventListener('click', () => this.playInteractiveCurrentExample());
    }
    if (this.btnFullAudioRound) {
      this.btnFullAudioRound.addEventListener('click', () => this.playInteractiveCurrentWord());
    }
    if (this.btnInteractiveMic) {
      this.btnInteractiveMic.addEventListener('click', () => this.toggleSpeechRecognition());
    }
    if (this.interactiveInputAnswer) {
      this.interactiveInputAnswer.addEventListener('input', (e) => this.handleInteractiveInput(e));
      this.interactiveInputAnswer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.interactiveIsAnswerLocked && this.interactiveInputAnswer.value.trim().length > 0) {
          e.preventDefault();
          this.handleInteractiveSubmit();
        }
      });
    }
    if (this.chkInteractiveLengthHint) {
      this.chkInteractiveLengthHint.addEventListener('change', () => this.toggleLengthHint());
    }
    if (this.btnInteractiveGiveUp) {
      this.btnInteractiveGiveUp.addEventListener('click', () => this.handleInteractiveGiveUp(false));
    }
    if (this.btnInteractiveSubmit) {
      this.btnInteractiveSubmit.addEventListener('click', () => this.handleInteractiveSubmit());
    }
    if (this.btnConfirmRetype) {
      this.btnConfirmRetype.addEventListener('click', () => this.handleForceRetypeSubmit());
    }
    if (this.inputForceRetype) {
      this.inputForceRetype.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleForceRetypeSubmit();
        }
      });
    }
    if (this.btnInteractiveNextWord) {
      this.btnInteractiveNextWord.addEventListener('click', () => this.handleInteractiveNextQuestion());
    }

    // Secondary actions
    if (this.btnInteractiveLearnLater) {
      this.btnInteractiveLearnLater.addEventListener('click', () => this.handleSecondaryAction('later'));
    }
    if (this.btnInteractiveEditMeaning) {
      this.btnInteractiveEditMeaning.addEventListener('click', () => this.handleSecondaryAction('edit'));
    }
    if (this.btnInteractivePassiveMode) {
      this.btnInteractivePassiveMode.addEventListener('click', () => this.handleSecondaryAction('passive'));
    }
    if (this.btnInteractiveReport) {
      this.btnInteractiveReport.addEventListener('click', () => this.handleSecondaryAction('report'));
    }

    // Breakdown analysis buttons
    if (this.btnAnalyzeDefinition) {
      this.btnAnalyzeDefinition.addEventListener('click', () => this.analyzeCurrentDefinition());
    }
    if (this.btnAnalyzeMeaning) {
      this.btnAnalyzeMeaning.addEventListener('click', () => this.analyzeCurrentMeaning());
    }

    // Summary modal buttons
    if (this.btnIntSumClose) {
      this.btnIntSumClose.addEventListener('click', () => this.closeInteractiveSummary());
    }
    if (this.btnIntSumNext) {
      this.btnIntSumNext.addEventListener('click', () => this.startNextInteractiveSession());
    }
    if (this.btnIntSumRetryMistakes) {
      this.btnIntSumRetryMistakes.addEventListener('click', () => this.retryInteractiveMistakes());
    }
  }

  init() {
    this.refreshAllData();
    if (window.lucide) lucide.createIcons();
  }

  refreshAllData() {
    this.allDecks = StorageManager.getDecks();
    this.allCards = StorageManager.getCards();
    this.updateHeaderStats();
    this.populateDeckSelects();
    this.renderDecksView();
    this.applyStudyFilter();
    this.renderManagerCards();
    this.updateSrsBanner();
    this.updateMistakesCounters();
  }

  updateHeaderStats() {
    const expData = GamificationEngine.getExpData();
    const streak = GamificationEngine.getStreakData();
    const quests = GamificationEngine.getDailyQuests();

    // EXP Bar
    const curLevel = USER_LEVELS.find(l => l.level === expData.level) || USER_LEVELS[0];
    const nextLevel = USER_LEVELS.find(l => l.level === expData.level + 1) || curLevel;
    const levelRange = Math.max(1, nextLevel.minExp - curLevel.minExp);
    const progressInLevel = Math.max(0, expData.exp - curLevel.minExp);
    const pct = Math.min(100, Math.round((progressInLevel / levelRange) * 100));

    this.headerUserLevel.textContent = `Lv ${expData.level}`;
    this.headerUserTitle.textContent = curLevel.title.split(' ')[0];
    this.headerExpText.textContent = `${expData.exp}/${nextLevel.minExp} XP`;
    this.headerExpBar.style.width = `${pct}%`;

    // Streak
    this.statStreak.textContent = streak.count;

    // Quests alert badge
    const hasClaimable = quests.some(q => !q.claimed && q.current >= q.target);
    if (hasClaimable) {
      this.questAlertBadge.classList.remove('hidden');
    } else {
      this.questAlertBadge.classList.add('hidden');
    }

    this.badgeDecksCount.textContent = this.allDecks.length;
    this.badgeTotalCount.textContent = this.allCards.length;
  }

  updateSrsBanner() {
    const dueCards = this.allCards.filter(c => SRSEngine.isDueToday(c));
    this.badgeDueCount.textContent = dueCards.length;
    if (dueCards.length > 0) {
      this.bannerSrsDue.classList.remove('hidden');
    } else {
      this.bannerSrsDue.classList.add('hidden');
    }
  }

  populateDeckSelects() {
    const options = this.allDecks.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    this.studyDeckFilterSelect.innerHTML = `<option value="all">Tất cả các bộ</option>` + options;
    this.addWordDeckSelect.innerHTML = options;
    this.bulkAddDeckSelect.innerHTML = options;
    this.managerDeckFilter.innerHTML = `<option value="all">Tất cả bộ sưu tập</option>` + options;
    this.modalDeckSelect.innerHTML = options;
    if (this.interactiveDeckSelect) {
      this.interactiveDeckSelect.innerHTML = `<option value="all">Tất cả các bộ từ</option>` + options;
    }
  }

  switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));

    if (tab === 'study') {
      this.tabStudy.classList.add('active');
      this.viewStudy.classList.remove('hidden');
      this.applyStudyFilter();
    } else if (tab === 'interactive') {
      if (this.tabInteractive) this.tabInteractive.classList.add('active');
      if (this.viewInteractive) this.viewInteractive.classList.remove('hidden');
      this.openInteractiveSetup();
    } else if (tab === 'decks') {
      this.tabDecks.classList.add('active');
      this.viewDecks.classList.remove('hidden');
      this.renderDecksView();
    } else if (tab === 'add') {
      this.tabAdd.classList.add('active');
      this.viewAdd.classList.remove('hidden');
      this.inputLookupWord.focus();
    } else if (tab === 'manager') {
      this.tabManager.classList.add('active');
      this.viewManager.classList.remove('hidden');
      this.renderManagerCards();
    }

    if (window.lucide) lucide.createIcons();
  }

  // ==========================================================================
  // STUDY & PRACTICE MODES
  // ==========================================================================
  setStudyMode(mode) {
    this.currentMode = mode;
    this.modeFlashcardBtn.classList.toggle('active', mode === 'flashcard');
    this.modeChoiceBtn.classList.toggle('active', mode === 'choice');
    this.modeTypeViBtn.classList.toggle('active', mode === 'type-vi');
    this.modeTypeEnBtn.classList.toggle('active', mode === 'type-en');

    this.containerModeFlashcard.classList.toggle('hidden', mode !== 'flashcard');
    this.containerModeChoice.classList.toggle('hidden', mode !== 'choice');
    this.containerModeTypeVi.classList.toggle('hidden', mode !== 'type-vi');
    this.containerModeTypeEn.classList.toggle('hidden', mode !== 'type-en');

    this.isCardFlipped = false;
    this.flashcard3D.classList.remove('is-flipped');
    this.isAnswerLocked = false;

    this.renderCurrentCard();
    if (window.lucide) lucide.createIcons();
  }

  applyStudyFilter() {
    let list = [...this.allCards];

    // 1. Filter by Deck
    const isSpecificDeck = this.studyDeckFilter !== 'all';
    let deckCards = [];
    if (isSpecificDeck) {
      deckCards = list.filter(c => c.deckId === this.studyDeckFilter);
      list = deckCards;
    }

    // Cập nhật dropdown chọn phần nhỏ (Sub-deck)
    this.updateStudyBatchSelect(isSpecificDeck ? deckCards : []);

    // 2. Filter by Sub-deck Batch
    let isSubdeckActive = false;
    let batchLabel = '';
    if (isSpecificDeck && this.studyBatchIndex !== 'all') {
      const bIdx = parseInt(this.studyBatchIndex, 10);
      const bSize = StorageManager.getDeckBatchSize(this.studyDeckFilter);
      this.studyBatchSize = bSize;
      const start = bIdx * bSize;
      const end = start + bSize;
      const totalInDeck = list.length;
      list = list.slice(start, end);
      isSubdeckActive = true;
      batchLabel = `Phần ${bIdx + 1} (Câu ${start + 1} - ${Math.min(end, totalInDeck)})`;
    }

    // 3. Filter by Status / SRS
    const status = this.studyFilterSelect ? this.studyFilterSelect.value : 'all';
    this.studyStatusFilter = status;
    let isMistakesActive = false;

    if (status === 'due') {
      list = list.filter(c => SRSEngine.isDueToday(c));
    } else if (status === 'mistakes') {
      const mistakeIds = StorageManager.getMistakeCardIds();
      list = list.filter(c => mistakeIds.includes(c.id));
      isMistakesActive = true;
    } else if (status === 'unstudied') {
      list = list.filter(c => VocabMasterApp.getCardStatus(c) === 'unstudied');
    } else if (status === 'learning') {
      list = list.filter(c => VocabMasterApp.getCardStatus(c) === 'reviewing');
    } else if (status === 'mastered') {
      list = list.filter(c => VocabMasterApp.getCardStatus(c) === 'mastered');
    }

    // Áp dụng giới hạn số từ nếu người dùng chọn
    const limitVal = this.studyLimitSelect ? this.studyLimitSelect.value : 'all';
    if (limitVal !== 'all' && !isSubdeckActive && status !== 'mistakes') {
      const limit = parseInt(limitVal, 10);
      if (!isNaN(limit) && limit > 0 && list.length > limit) {
        list = list.slice(0, limit);
      }
    }

    // 4. Update Active Scope Banner
    this.updateActiveScopeBanner(isSubdeckActive, batchLabel, isMistakesActive, list.length);

    this.filteredCards = list;
    this.currentIndex = 0;
    this.renderCurrentCard();
    this.updateMistakesCounters();
  }

  updateStudyBatchSelect(deckCards) {
    if (!this.containerStudyBatchFilter || !this.studyBatchFilterSelect) return;

    if (this.studyDeckFilter === 'all' || !deckCards || deckCards.length === 0) {
      this.containerStudyBatchFilter.classList.add('hidden');
      this.containerStudyBatchFilter.classList.remove('flex');
      this.studyBatchIndex = 'all';
      return;
    }

    this.containerStudyBatchFilter.classList.remove('hidden');
    this.containerStudyBatchFilter.classList.add('flex');

    const total = deckCards.length;
    const bSize = StorageManager.getDeckBatchSize(this.studyDeckFilter);
    this.studyBatchSize = bSize;
    const numBatches = Math.ceil(total / bSize);

    let html = `<option value="all">Toàn bộ (${total} từ)</option>`;
    for (let i = 0; i < numBatches; i++) {
      const start = i * bSize;
      const end = Math.min(start + bSize, total);
      const batchCards = deckCards.slice(start, end);
      const reviewed = batchCards.filter(c => VocabMasterApp.getCardStatus(c) !== 'unstudied').length;
      const isSelected = String(this.studyBatchIndex) === String(i) ? 'selected' : '';
      html += `<option value="${i}" ${isSelected}>Phần ${i + 1} (${start + 1}-${end}): ${reviewed}/${batchCards.length} đã ôn</option>`;
    }

    this.studyBatchFilterSelect.innerHTML = html;
  }

  updateActiveScopeBanner(isSubdeckActive, batchLabel, isMistakesActive, count) {
    if (!this.studyActiveScopeBanner || !this.studyScopeText) return;

    if (isMistakesActive) {
      this.studyActiveScopeBanner.classList.remove('hidden');
      this.studyActiveScopeBanner.classList.add('flex');
      this.studyActiveScopeBanner.className = 'max-w-2xl mx-auto mb-3 p-3 sm:p-3.5 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-xs flex items-center justify-between shadow-sm animate-fadeIn';
      this.studyScopeText.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-extrabold flex items-center space-x-1.5"><i data-lucide="alert-triangle" class="w-4 h-4 mr-1"></i><span>Chế độ Ôn Lại Câu Chọn Sai (Hiện có <strong>${count}</strong> từ)</span></span>`;
      if (window.lucide) lucide.createIcons();
    } else if (isSubdeckActive) {
      const currentDeck = this.allDecks.find(d => d.id === this.studyDeckFilter);
      const deckName = currentDeck ? currentDeck.name : 'Bộ sưu tập';
      this.studyActiveScopeBanner.classList.remove('hidden');
      this.studyActiveScopeBanner.classList.add('flex');
      this.studyActiveScopeBanner.className = 'max-w-2xl mx-auto mb-3 p-3 sm:p-3.5 rounded-2xl bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/30 text-xs flex items-center justify-between shadow-sm animate-fadeIn';
      this.studyScopeText.innerHTML = `<span class="text-brand-700 dark:text-brand-300 font-extrabold flex items-center space-x-1.5"><i data-lucide="boxes" class="w-4 h-4 mr-1"></i><span>${deckName} • ${batchLabel} (Phạm vi: <strong>${count}</strong> từ)</span></span>`;
      if (window.lucide) lucide.createIcons();
    } else {
      this.studyActiveScopeBanner.classList.add('hidden');
      this.studyActiveScopeBanner.classList.remove('flex');
    }
  }

  updateMistakesCounters() {
    const mistakeIds = StorageManager.getMistakeCardIds();
    const count = mistakeIds.length;

    // Manager tab count
    if (this.countMgrMistakes) {
      this.countMgrMistakes.textContent = count;
    }

    // Quick review button in Study View
    if (this.btnQuickMistakes && this.quickMistakesCount) {
      this.quickMistakesCount.textContent = count;
      if (count > 0) {
        this.btnQuickMistakes.classList.remove('hidden');
        this.btnQuickMistakes.classList.add('inline-flex');
      } else {
        this.btnQuickMistakes.classList.add('hidden');
        this.btnQuickMistakes.classList.remove('inline-flex');
      }
    }
  }

  openMistakesReviewMode() {
    const mistakeIds = StorageManager.getMistakeCardIds();
    if (mistakeIds.length === 0) {
      Toast.show('Tuyệt vời! Hiện tại bạn không có câu nào trong danh sách cần ôn lại.', 'info', 2500);
      return;
    }
    this.studyDeckFilter = 'all';
    if (this.studyDeckFilterSelect) this.studyDeckFilterSelect.value = 'all';
    this.studyBatchIndex = 'all';
    this.studyStatusFilter = 'mistakes';
    if (this.studyFilterSelect) this.studyFilterSelect.value = 'mistakes';
    this.switchTab('study');
    Toast.show(`Đang mở chế độ ôn lại ${mistakeIds.length} câu đã chọn sai`, 'info', 2000);
  }

  removeSingleMistake(cardId) {
    StorageManager.removeMistake(cardId);
    this.updateMistakesCounters();
    this.renderManagerCards();
    this.renderDecksView();
    Toast.show('Đã bỏ thẻ khỏi danh sách câu sai', 'info', 1500);
  }

  shuffleCards() {
    for (let i = this.filteredCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.filteredCards[i], this.filteredCards[j]] = [this.filteredCards[j], this.filteredCards[i]];
    }
    this.currentIndex = 0;
    Toast.show('Đã xáo trộn thứ tự từ vựng', 'info', 1500);
    this.renderCurrentCard();
  }

  getCurrentCard() {
    if (this.filteredCards.length === 0) return null;
    return this.filteredCards[this.currentIndex];
  }

  renderCurrentCard() {
    const total = this.filteredCards.length;
    if (total === 0) {
      this.studyCardWrapper.classList.add('hidden');
      this.studyEmptyState.classList.remove('hidden');
      this.studyProgressIndicator.textContent = '0 / 0';
      this.studyProgressBar.style.width = '0%';
      return;
    }

    this.studyCardWrapper.classList.remove('hidden');
    this.studyEmptyState.classList.add('hidden');

    const card = this.getCurrentCard();
    const deck = this.allDecks.find(d => d.id === card.deckId) || { name: 'Chủ đề', color: 'indigo' };

    // Update Progress
    this.studyProgressIndicator.textContent = `${this.currentIndex + 1} / ${total}`;
    const pct = Math.round(((this.currentIndex + 1) / total) * 100);
    this.studyProgressBar.style.width = `${pct}%`;

    // Render Mode 0: Flashcard 3D
    this.renderFlashcardMode(card, deck);

    // Render Mode 1: Multiple Choice
    this.renderChoiceMode(card, deck);

    // Render Mode 2: Look EN -> Type VI
    this.renderTypeViMode(card, deck);

    // Render Mode 3: Look VI -> Type EN
    this.renderTypeEnMode(card, deck);

    if (window.lucide) lucide.createIcons();
  }

  // --- Flashcard 3D ---
  renderFlashcardMode(card, deck) {
    this.isCardFlipped = false;
    this.flashcard3D.classList.remove('is-flipped');

    this.fcFrontDeckBadge.textContent = deck.name;
    this.fcFrontPosBadge.textContent = card.partOfSpeech || 'noun';
    this.fcFrontWord.textContent = card.word;
    this.fcFrontPhonetic.textContent = card.phonetic || '/.../';

    // SRS badge
    const srsLevel = card.level || 1;
    this.fcFrontSrsBadge.className = `text-[11px] font-mono px-2 py-0.5 rounded-md srs-badge-${srsLevel} border font-semibold flex items-center space-x-1`;
    this.fcFrontSrsBadge.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i><span>Mốc ${srsLevel}</span>`;

    // Back card
    this.fcBackWordMini.textContent = card.word;
    this.fcBackPos.textContent = `(${card.partOfSpeech || 'noun'})`;
    this.fcBackMeaning.textContent = card.vietnameseMeaning;

    const fcExampleBox = document.getElementById('fc-example-box');
    if (fcExampleBox) {
      if (card.exampleEn && card.exampleEn.trim().length > 0) {
        fcExampleBox.classList.remove('hidden');
        this.fcBackExampleEn.textContent = `"${card.exampleEn}"`;
        this.fcBackExampleVi.textContent = card.exampleVi || '';
      } else {
        fcExampleBox.classList.add('hidden');
      }
    }

    this.fcBackReviewCount.textContent = `${card.reviewCount || 0} lần`;

    const intervalDays = SRS_INTERVALS[srsLevel] || 1;
    this.fcBackSrsInfo.textContent = `Mốc ${srsLevel} (Ôn sau ${intervalDays} ngày)`;
  }

  flipFlashcard() {
    this.isCardFlipped = !this.isCardFlipped;
    this.flashcard3D.classList.toggle('is-flipped', this.isCardFlipped);
  }

  handleCardReviewResult(card, isSuccess) {
    if (!card) return { isCorrect: false };

    SRSEngine.recordReview(card, isSuccess);
    StorageManager.updateCard(card.id, card);
    GamificationEngine.updateStreakOnStudy();
    GamificationEngine.updateQuestProgress('quest-review', 1);

    if (isSuccess) {
      this.audio.playSuccess();
      const expRes = GamificationEngine.addExp(15);
      this.consecutiveCorrectCount++;
      if (this.consecutiveCorrectCount >= 5) {
        GamificationEngine.updateQuestProgress('quest-streak-combo', 1);
      }
      if (expRes.isLevelUp) this.triggerLevelUpCelebration(expRes);

      // Kiểm tra câu này có nằm trong Mistake Pool không
      const wasInMistakes = StorageManager.isMistake(card.id);
      if (wasInMistakes) {
        StorageManager.removeMistake(card.id);
        this.updateMistakesCounters();
        Toast.show(`🎉 Đã vượt qua "${card.word}"! Đã xóa khỏi danh sách câu sai.`, 'success', 2500);

        // Nếu đang lọc ở chế độ câu sai:
        if (this.studyStatusFilter === 'mistakes') {
          this.filteredCards = this.filteredCards.filter(c => c.id !== card.id);
          this.updateHeaderStats();
          this.updateSrsBanner();

          if (this.filteredCards.length === 0) {
            this.confetti.fire(2500);
            Toast.show('🌟 Xuất sắc! Bạn đã giải quyết xong toàn bộ câu sai cần ôn lại!', 'success', 3500);
            this.renderCurrentCard();
            return { isCorrect: true, clearedMistake: true, emptyPool: true };
          }

          if (this.currentIndex >= this.filteredCards.length) {
            this.currentIndex = 0;
          }
          return { isCorrect: true, clearedMistake: true, emptyPool: false };
        }
      } else {
        Toast.show(`+15 XP! Chính xác (Mốc ${card.level})`, 'success', 1500);
      }
    } else {
      this.audio.playError();
      this.consecutiveCorrectCount = 0;
      StorageManager.addMistake(card.id);
      this.updateMistakesCounters();
      Toast.show('Chưa chính xác! Đã lưu vào danh sách "Cần ôn lại" ⚠️', 'error', 2000);
    }

    this.updateHeaderStats();
    this.updateSrsBanner();
    return { isCorrect: isSuccess, clearedMistake: false, emptyPool: false };
  }

  handleSrsReview(isSuccess) {
    const card = this.getCurrentCard();
    if (!card) return;

    if (SRSEngine.isDueToday(card)) {
      GamificationEngine.updateQuestProgress('quest-srs', 1);
    }

    const res = this.handleCardReviewResult(card, isSuccess);
    if (res.emptyPool) return;

    // Auto advance
    setTimeout(() => {
      if (res.clearedMistake && this.studyStatusFilter === 'mistakes') {
        this.renderCurrentCard();
      } else {
        this.nextCard();
      }
    }, 400);
  }

  // --- Multiple Choice Mode ---
  renderChoiceMode(card, deck) {
    this.isAnswerLocked = false;
    this.choiceFeedbackBox.classList.add('hidden');

    this.choiceDeckBadge.textContent = deck.name;
    this.choicePosBadge.textContent = card.partOfSpeech || 'noun';
    this.choicePrimaryWord.textContent = card.word;
    this.choicePhonetic.textContent = card.phonetic || '';

    // Generate options: 1 correct + 3 distractors
    const correct = card.vietnameseMeaning;
    let pool = card.distractors && card.distractors.length >= 3 ? [...card.distractors] : DictionaryService.generateDistractors(correct);
    const options = [correct, ...pool.slice(0, 3)].sort(() => 0.5 - Math.random());
    this.choiceOptions = options;

    this.choiceOptionsGrid.innerHTML = options.map((opt, idx) => `
      <button data-opt-idx="${idx}" class="choice-opt-btn w-full p-4 rounded-2xl bg-slate-50 dark:bg-surface-elevated hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-surface-border text-left font-medium text-sm sm:text-base flex items-center justify-between transition-all group active:scale-[0.99]">
        <div class="flex items-center space-x-3">
          <span class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors">
            ${idx + 1}
          </span>
          <span class="text-slate-800 dark:text-slate-200 font-semibold">${opt}</span>
        </div>
        <div class="choice-opt-icon"></div>
      </button>
    `).join('');

    this.choiceOptionsGrid.querySelectorAll('.choice-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.optIdx, 10);
        this.handleChoiceAnswer(idx);
      });
    });
  }

  handleChoiceAnswer(selectedIndex) {
    if (this.isAnswerLocked) return;
    this.isAnswerLocked = true;

    const card = this.getCurrentCard();
    const chosen = this.choiceOptions[selectedIndex];
    const isCorrect = chosen === card.vietnameseMeaning;

    const buttons = this.choiceOptionsGrid.querySelectorAll('.choice-opt-btn');
    buttons.forEach((btn, idx) => {
      const opt = this.choiceOptions[idx];
      if (opt === card.vietnameseMeaning) {
        btn.classList.add('bg-emerald-500/20', 'border-emerald-500', 'text-emerald-600', 'dark:text-emerald-400');
        btn.querySelector('.choice-opt-icon').innerHTML = `<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>`;
      } else if (idx === selectedIndex && !isCorrect) {
        btn.classList.add('bg-rose-500/20', 'border-rose-500', 'text-rose-600', 'dark:text-rose-400');
        btn.querySelector('.choice-opt-icon').innerHTML = `<i data-lucide="x-circle" class="w-5 h-5 text-rose-500"></i>`;
      }
    });

    // Process result with centralized review engine (SRS, Mistakes, EXP, Streak)
    const reviewResult = this.handleCardReviewResult(card, isCorrect);

    // Show context example feedback if available
    if (card.exampleEn && card.exampleEn.trim().length > 0) {
      this.choiceExampleEn.parentElement.classList.remove('hidden');
      this.choiceExampleEn.textContent = `"${card.exampleEn}"`;
      this.choiceExampleVi.textContent = card.exampleVi || '';
    } else {
      this.choiceExampleEn.parentElement.classList.add('hidden');
    }
    this.choiceFeedbackBox.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
  }

  // --- Look EN -> Type VI ---
  renderTypeViMode(card, deck) {
    this.isAnswerLocked = false;
    this.typeViFeedbackBox.classList.add('hidden');
    this.boxHintMaskedVi.classList.add('hidden');
    this.labelToggleHintVi.textContent = 'Hiện gợi ý';
    this.inputTypeMeaningVi.value = '';
    this.inputTypeMeaningVi.disabled = false;

    this.typeViDeckBadge.textContent = deck.name;
    this.typeViPosBadge.textContent = card.partOfSpeech || 'noun';
    this.typeViWord.textContent = card.word;
    this.typeViPhonetic.textContent = card.phonetic || '';

    // Hint text
    if (card.exampleEn && card.exampleEn.trim().length > 0) {
      const re = new RegExp(`\\b${card.word}\\b`, 'gi');
      const masked = card.exampleEn.replace(re, '_______');
      this.hintMaskedSentenceVi.textContent = `"${masked}"`;
    } else {
      const firstLetter = (card.vietnameseMeaning || '')[0] || '';
      this.hintMaskedSentenceVi.textContent = `Gợi ý: Từ loại (${card.partOfSpeech || 'noun'}) - Nghĩa bắt đầu bằng: "${firstLetter.toUpperCase()}..."`;
    }

    setTimeout(() => this.inputTypeMeaningVi.focus(), 150);
  }

  toggleHintVi() {
    const isHidden = this.boxHintMaskedVi.classList.toggle('hidden');
    this.labelToggleHintVi.textContent = isHidden ? 'Hiện gợi ý' : 'Ẩn gợi ý';
  }

  handleTypeViSubmit() {
    if (this.isAnswerLocked) return;
    const userText = this.inputTypeMeaningVi.value.trim();
    if (!userText) return;

    this.isAnswerLocked = true;
    this.inputTypeMeaningVi.disabled = true;

    const card = this.getCurrentCard();
    const evalRes = FuzzyMatchEngine.evaluateVietnameseMeaning(userText, card.vietnameseMeaning);

    const reviewRes = this.handleCardReviewResult(card, evalRes.isCorrect);

    if (evalRes.isCorrect) {
      this.typeViFeedbackBox.className = 'mt-4 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 animate-fadeIn';
      this.typeViFeedbackTitle.textContent = 'Chính xác!';
      this.typeViFeedbackTitle.className = 'font-bold text-sm text-emerald-600 dark:text-emerald-400';
      this.typeViFeedbackIcon.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-500"></i>`;
    } else {
      this.typeViFeedbackBox.className = 'mt-4 p-4 sm:p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3 animate-fadeIn';
      this.typeViFeedbackTitle.textContent = 'Chưa chính xác!';
      this.typeViFeedbackTitle.className = 'font-bold text-sm text-rose-600 dark:text-rose-400';
      this.typeViFeedbackIcon.innerHTML = `<i data-lucide="x-circle" class="w-5 h-5 text-rose-500"></i>`;
    }

    this.typeViMatchScore.textContent = `Độ khớp: ${evalRes.score}%`;
    this.typeViExpected.textContent = card.vietnameseMeaning;
    if (card.exampleEn && card.exampleEn.trim().length > 0) {
      this.typeViExampleEn.parentElement.parentElement.classList.remove('hidden');
      this.typeViExampleEn.textContent = `"${card.exampleEn}"`;
      this.typeViExampleVi.textContent = card.exampleVi || '';
    } else {
      this.typeViExampleEn.parentElement.parentElement.classList.add('hidden');
    }
    this.typeViFeedbackBox.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
  }

  // --- Look VI -> Type EN (Spelling) ---
  renderTypeEnMode(card, deck) {
    this.isAnswerLocked = false;
    this.typeEnFeedbackBox.classList.add('hidden');
    this.boxHintMaskedEn.classList.add('hidden');
    this.labelToggleHintEn.textContent = 'Hiện chữ cái đầu';
    this.inputTypeEnWord.value = '';
    this.inputTypeEnWord.disabled = false;

    this.typeEnDeckBadge.textContent = deck.name;
    this.typeEnPosBadge.textContent = card.partOfSpeech || 'noun';
    this.typeEnMeaningTitle.textContent = card.vietnameseMeaning;
    this.typeEnExampleViPreview.textContent = card.exampleVi ? `Dịch ví dụ: "${card.exampleVi}"` : '';

    // Spelling hint: first letter + underscores
    const word = card.word || '';
    let hintStr = word.charAt(0);
    for (let i = 1; i < word.length; i++) {
      hintStr += (word[i] === ' ' || word[i] === '-') ? ` ${word[i]} ` : ' _ ';
    }
    this.boxHintMaskedEn.textContent = hintStr;

    setTimeout(() => this.inputTypeEnWord.focus(), 150);
  }

  toggleHintEn() {
    const isHidden = this.boxHintMaskedEn.classList.toggle('hidden');
    this.labelToggleHintEn.textContent = isHidden ? 'Hiện chữ cái đầu' : 'Ẩn gợi ý';
  }

  handleTypeEnSubmit() {
    if (this.isAnswerLocked) return;
    const userWord = this.inputTypeEnWord.value.trim();
    if (!userWord) return;

    this.isAnswerLocked = true;
    this.inputTypeEnWord.disabled = true;

    const card = this.getCurrentCard();
    const isCorrect = FuzzyMatchEngine.evaluateEnglishSpelling(userWord, card.word);

    const reviewRes = this.handleCardReviewResult(card, isCorrect);

    if (isCorrect) {
      this.playCurrentAudio(); // pronunciation reinforcement
      this.typeEnFeedbackBox.className = 'mt-4 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 animate-fadeIn';
      this.typeEnFeedbackTitle.textContent = 'Chính xác tuyệt đối!';
      this.typeEnFeedbackTitle.className = 'font-bold text-sm text-emerald-600 dark:text-emerald-400';
      this.typeEnFeedbackIcon.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-500"></i>`;
    } else {
      this.typeEnFeedbackBox.className = 'mt-4 p-4 sm:p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3 animate-fadeIn';
      this.typeEnFeedbackTitle.textContent = 'Sai chính tả!';
      this.typeEnFeedbackTitle.className = 'font-bold text-sm text-rose-600 dark:text-rose-400';
      this.typeEnFeedbackIcon.innerHTML = `<i data-lucide="x-circle" class="w-5 h-5 text-rose-500"></i>`;
    }

    this.typeEnExpectedWord.textContent = card.word;
    if (card.exampleEn && card.exampleEn.trim().length > 0) {
      this.typeEnExampleEn.parentElement.classList.remove('hidden');
      this.typeEnExampleEn.textContent = `"${card.exampleEn}"`;
    } else {
      this.typeEnExampleEn.parentElement.classList.add('hidden');
    }
    this.typeEnFeedbackBox.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
  }

  // --- Card Audio & Navigation ---
  playCurrentAudio() {
    const card = this.getCurrentCard();
    if (!card) return;
    this.audio.playWordPronunciation(card.word, card.audioUrl);
  }

  nextCard() {
    if (this.filteredCards.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.filteredCards.length;
    this.renderCurrentCard();
  }

  prevCard() {
    if (this.filteredCards.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.filteredCards.length) % this.filteredCards.length;
    this.renderCurrentCard();
  }

  handleMarkAsMastered(targetCard = null) {
    const card = targetCard || this.getCurrentCard();
    if (!card) return;

    const today = SRSEngine.getTodayString();
    card.level = 6;
    card.mastered = true;
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.consecutiveCorrect = (card.consecutiveCorrect || 0) + 1;
    card.lastReviewedDate = today;
    card.nextReviewDate = SRSEngine.addDays(today, 60);

    StorageManager.updateCard(card.id, card);

    // Xóa khỏi Mistake Pool nếu thẻ này từng nằm trong danh sách câu sai
    const wasInMistakes = StorageManager.isMistake(card.id);
    if (wasInMistakes) {
      StorageManager.removeMistake(card.id);
      this.updateMistakesCounters();
    }

    // Gamification & Thưởng EXP
    GamificationEngine.updateStreakOnStudy();
    GamificationEngine.updateQuestProgress('quest-review', 1);
    const expRes = GamificationEngine.addExp(30);

    // Hiệu ứng âm thanh & Pháo hoa Confetti
    this.audio.playSuccess();
    this.confetti.fire(1500);
    Toast.show(`🌟 Tuyệt vời! "${card.word}" đã được đưa vào danh sách "Đã thuộc vững" (+30 XP)!`, 'success', 2500);

    if (expRes.isLevelUp) {
      this.triggerLevelUpCelebration(expRes);
    }

    this.updateHeaderStats();
    this.updateSrsBanner();

    // Nếu đang ở bộ lọc cần loại trừ từ đã thuộc
    if (this.studyStatusFilter === 'mistakes' || this.studyStatusFilter === 'learning' || this.studyStatusFilter === 'unstudied') {
      this.filteredCards = this.filteredCards.filter(c => c.id !== card.id);
      if (this.filteredCards.length === 0) {
        this.renderCurrentCard();
        return;
      }
      if (this.currentIndex >= this.filteredCards.length) {
        this.currentIndex = 0;
      }
      this.renderCurrentCard();
      return;
    }

    // Chuyển sang thẻ tiếp theo
    setTimeout(() => this.nextCard(), 350);
  }

  toggleMasteredCard(cardId) {
    const card = this.allCards.find(c => c.id === cardId);
    if (!card) return;

    if (!card.mastered) {
      this.handleMarkAsMastered(card);
      this.renderManagerCards();
      this.renderDecksView();
    } else {
      if (confirm(`Bạn có muốn chuyển từ "${card.word}" về trạng thái "Đang ôn tập" (Mốc 1) không?`)) {
        card.mastered = false;
        card.level = 1;
        card.nextReviewDate = SRSEngine.getTodayString();
        StorageManager.updateCard(card.id, card);
        this.refreshAllData();
        Toast.show(`Đã chuyển "${card.word}" về trạng thái đang ôn tập`, 'info', 1500);
      }
    }
  }

  // Global Keyboard Shortcuts
  handleGlobalKeydown(e) {
    // Interactive Session Shortcuts
    if (this.viewInteractive && !this.viewInteractive.classList.contains('hidden')) {
      // 1. Ctrl: Replay current word pronunciation
      if (e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        e.preventDefault();
        this.playInteractiveCurrentWord();
        return;
      }

      // 2. Escape:
      if (e.key === 'Escape') {
        if (!this.interactiveActiveScreen.classList.contains('hidden') && !this.interactiveIsAnswerLocked) {
          e.preventDefault();
          this.handleInteractiveGiveUp(false);
          return;
        }
      }

      // 3. Enter:
      if (e.key === 'Enter') {
        if (e.target === this.inputForceRetype) {
          e.preventDefault();
          this.handleForceRetypeSubmit();
          return;
        }
        if (e.target === this.interactiveInputAnswer && !this.interactiveIsAnswerLocked) {
          e.preventDefault();
          if (this.interactiveInputAnswer.value.trim().length > 0) {
            this.handleInteractiveSubmit();
          }
          return;
        }
        if (this.interactiveIsAnswerLocked && this.btnInteractiveNextWord && !this.btnInteractiveNextWord.classList.contains('hidden')) {
          e.preventDefault();
          this.handleInteractiveNextQuestion();
          return;
        }
      }

      // If user is typing in interactive input or force retype, don't trigger regular study shortcuts
      if (e.target.matches('input, textarea, select')) {
        return;
      }
    }

    // If user is typing in a modal or search input, do not capture study shortcuts
    if (e.target.matches('input, textarea, select')) {
      if (e.key === 'Enter' && e.target === this.inputTypeMeaningVi) {
        // let form submit handle it
        return;
      }
      if (e.key === 'Enter' && e.target === this.inputTypeEnWord) {
        return;
      }
      return;
    }

    // Space: Play Pronunciation
    if (e.code === 'Space') {
      e.preventDefault();
      this.playCurrentAudio();
      return;
    }

    // Enter: Advance card or continue
    if (e.key === 'Enter') {
      if (this.currentMode === 'choice' && this.isAnswerLocked) {
        this.nextCard();
      } else if (this.currentMode === 'type-vi' && this.isAnswerLocked) {
        this.nextCard();
      } else if (this.currentMode === 'type-en' && this.isAnswerLocked) {
        this.nextCard();
      } else if (this.currentMode === 'flashcard') {
        this.flipFlashcard();
      }
      return;
    }

    // Flashcard 3D shortcuts
    if (this.currentMode === 'flashcard') {
      if (e.key === 'f' || e.key === 'F') {
        this.flipFlashcard();
      } else if (e.key === '1') {
        this.handleSrsReview(false);
      } else if (e.key === '2') {
        this.handleSrsReview(true);
      } else if (e.key === '3' || e.key === 'm' || e.key === 'M') {
        this.handleMarkAsMastered();
      }
      return;
    }

    // Multiple Choice shortcuts: 1, 2, 3, 4
    if (this.currentMode === 'choice' && !this.isAnswerLocked) {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (this.choiceOptions[idx]) {
          this.handleChoiceAnswer(idx);
        }
      }
    }
  }

  // ==========================================================================
  // VIEW 2: COLLECTIONS (DECKS) MANAGEMENT & PROGRESS TRACKING
  // ==========================================================================
  renderDecksView() {
    this.decksGrid.innerHTML = this.allDecks.map(deck => {
      const cardsInDeck = this.allCards.filter(c => c.deckId === deck.id);
      const total = cardsInDeck.length;
      const dueCards = cardsInDeck.filter(c => SRSEngine.isDueToday(c));

      // Phân loại 3 trạng thái chuẩn & danh sách câu sai
      const unstudiedCards = cardsInDeck.filter(c => VocabMasterApp.getCardStatus(c) === 'unstudied');
      const reviewingCards = cardsInDeck.filter(c => VocabMasterApp.getCardStatus(c) === 'reviewing');
      const masteredCards = cardsInDeck.filter(c => VocabMasterApp.getCardStatus(c) === 'mastered');
      const mistakeCards = cardsInDeck.filter(c => StorageManager.isMistake(c.id));

      const reviewedCount = reviewingCards.length + masteredCards.length;
      const reviewedPct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;
      const masteredPct = total > 0 ? Math.round((masteredCards.length / total) * 100) : 0;
      const reviewingPct = total > 0 ? Math.round((reviewingCards.length / total) * 100) : 0;

      // Cấu hình chia nhỏ (Sub-decks / Batches)
      const batchSize = StorageManager.getDeckBatchSize(deck.id);
      const numBatches = total > 0 ? Math.ceil(total / batchSize) : 0;

      // Danh sách các phần nhỏ
      let batchesHtml = '';
      if (total > 0) {
        batchesHtml = Array.from({ length: numBatches }).map((_, i) => {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, total);
          const batchCards = cardsInDeck.slice(start, end);
          const batchTotal = batchCards.length;
          const batchReviewing = batchCards.filter(c => VocabMasterApp.getCardStatus(c) === 'reviewing').length;
          const batchMastered = batchCards.filter(c => VocabMasterApp.getCardStatus(c) === 'mastered').length;
          const batchReviewed = batchReviewing + batchMastered;
          const bPct = batchTotal > 0 ? Math.round((batchReviewed / batchTotal) * 100) : 0;
          const bMistakes = batchCards.filter(c => StorageManager.isMistake(c.id)).length;

          return `
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark/70 border border-slate-200/80 dark:border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-brand-500/40 transition-all">
              <div class="space-y-1">
                <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span class="font-bold text-xs text-slate-800 dark:text-slate-200">Phần ${i + 1}</span>
                  <span class="text-[11px] font-mono text-slate-400">(${start + 1} - ${end} • ${batchTotal} từ)</span>
                  ${bMistakes > 0 ? `<span class="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">⚠️ ${bMistakes} câu sai</span>` : ''}
                </div>
                <div class="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Đã ôn: <strong class="text-slate-700 dark:text-slate-300">${batchReviewed}/${batchTotal}</strong> (${bPct}%)</span>
                  <span>Thuộc: <strong class="text-emerald-500">${batchMastered}</strong></span>
                </div>
                <div class="w-36 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all" style="width: ${bPct}%"></div>
                </div>
              </div>

              <button onclick="window.app.studySpecificDeckBatch('${deck.id}', ${i}, ${batchSize})" class="self-start sm:self-center px-3 py-1.5 rounded-xl text-[11px] font-bold text-brand-600 dark:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 flex items-center space-x-1 transition-all active:scale-95 shadow-xs">
                <i data-lucide="play" class="w-3 h-3"></i>
                <span>Luyện Tập Phần ${i + 1}</span>
              </button>
            </div>
          `;
        }).join('');
      }

      return `
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-card border border-slate-200 dark:border-surface-border shadow-sm hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-4">
          
          <!-- Thông tin tiêu đề & Thao tác nhanh -->
          <div>
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-2.5">
                <span class="w-3.5 h-3.5 rounded-full bg-${deck.color || 'indigo'}-500 shadow-sm"></span>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white">${deck.name}</h3>
              </div>
              <div class="flex items-center space-x-1">
                <button onclick="window.app.confirmResetDeck('${deck.id}')" title="Học lại từ đầu (Reset toàn bộ tiến độ của bộ này)" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-all">
                  <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="window.app.editDeck('${deck.id}')" title="Sửa thông tin bộ từ" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="window.app.deleteDeck('${deck.id}')" title="Xóa bộ từ" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">${deck.description || 'Chưa có mô tả.'}</p>
          </div>

          <!-- Thống kê Tiến Độ & Thanh Tiến Trình Chi Tiết -->
          <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-surface-border/60">
            
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-700 dark:text-slate-300 font-semibold">
                Tiến độ: <strong>${reviewedCount}/${total}</strong> câu (<span class="text-brand-600 dark:text-brand-400 font-bold">${reviewedPct}%</span>)
              </span>
              ${dueCards.length > 0 ? `<span class="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⚡ Cần ôn: ${dueCards.length}</span>` : ''}
            </div>

            <!-- Thanh tiến trình đa đoạn Multi-segment (Đã thuộc: Xanh lá, Đang ôn: Xanh/Tím, Chưa ôn: Xám) -->
            <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div class="h-full bg-emerald-500 transition-all" style="width: ${masteredPct}%;" title="Đã thuộc: ${masteredCards.length} từ"></div>
              <div class="h-full bg-brand-500 transition-all" style="width: ${reviewingPct}%;" title="Đang ôn: ${reviewingCards.length} từ"></div>
            </div>

            <!-- 4 Huy hiệu trạng thái câu trực quan -->
            <div class="grid grid-cols-4 gap-1.5 text-center text-[11px] pt-1">
              <div class="p-1.5 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-surface-border">
                <div class="text-[10px] text-slate-400">Chưa ôn</div>
                <div class="font-bold text-slate-700 dark:text-slate-300">${unstudiedCards.length}</div>
              </div>
              <div class="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div class="text-[10px] text-indigo-500 dark:text-indigo-400">Đang ôn</div>
                <div class="font-bold text-indigo-600 dark:text-indigo-300">${reviewingCards.length}</div>
              </div>
              <div class="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div class="text-[10px] text-emerald-600 dark:text-emerald-400">Đã thuộc</div>
                <div class="font-bold text-emerald-600 dark:text-emerald-400">${masteredCards.length}</div>
              </div>
              <div class="p-1.5 rounded-xl ${mistakeCards.length > 0 ? 'bg-rose-500/15 border-rose-500/30' : 'bg-slate-100 dark:bg-surface-dark border-slate-200 dark:border-surface-border'} border">
                <div class="text-[10px] ${mistakeCards.length > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'}">Cần ôn</div>
                <div class="font-bold ${mistakeCards.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}">${mistakeCards.length}</div>
              </div>
            </div>

            <!-- Chia nhỏ bộ sưu tập (Sub-decks / Batches) -->
            ${total > 0 ? `
              <div class="mt-3 pt-3 border-t border-slate-100 dark:border-surface-border/60">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-1.5">
                    <i data-lucide="boxes" class="w-3.5 h-3.5 text-brand-500"></i>
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Chia nhỏ phần học (${numBatches} phần):</span>
                  </div>
                  <!-- Batch Size Selector: 10, 20, 25 câu/phần -->
                  <div class="flex items-center space-x-1">
                    <span class="text-[10px] text-slate-400">Cỡ phần:</span>
                    <select onchange="window.app.changeDeckBatchSize('${deck.id}', this.value)" class="text-[10px] font-bold bg-slate-100 dark:bg-surface-dark text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-surface-border rounded px-1.5 py-0.5 focus:outline-none">
                      <option value="10" ${batchSize === 10 ? 'selected' : ''}>10 từ</option>
                      <option value="20" ${batchSize === 20 ? 'selected' : ''}>20 từ</option>
                      <option value="25" ${batchSize === 25 ? 'selected' : ''}>25 từ</option>
                    </select>
                  </div>
                </div>

                <!-- Sub-decks List -->
                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  ${batchesHtml}
                </div>
              </div>
            ` : ''}

            <!-- Nút hành động chính -->
            <div class="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button onclick="window.app.studySpecificDeck('${deck.id}')" class="w-full sm:flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-brand-600/20 active:scale-95">
                <i data-lucide="play" class="w-3.5 h-3.5"></i>
                <span>Luyện Tập (${total} từ)</span>
              </button>
              <button onclick="window.app.startInteractiveForDeck('${deck.id}')" title="Học phiên tương tác chuyên sâu" class="w-full sm:w-auto px-3 py-2.5 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 flex items-center justify-center space-x-1 transition-all active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                <span>Học tương tác</span>
              </button>
              <button onclick="window.app.confirmResetDeck('${deck.id}')" title="Đặt lại tiến độ học lại từ đầu" class="p-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-surface-dark hover:bg-amber-500/10 hover:text-amber-500 dark:hover:bg-amber-500/20 border border-slate-200 dark:border-surface-border flex items-center justify-center transition-all">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
              </button>
            </div>

          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  studySpecificDeck(deckId) {
    this.studyDeckFilter = deckId;
    this.studyBatchIndex = 'all';
    this.studyDeckFilterSelect.value = deckId;
    this.studyFilterSelect.value = 'all';
    this.studyStatusFilter = 'all';
    this.switchTab('study');
  }

  studySpecificDeckBatch(deckId, batchIndex, batchSize = 20) {
    this.studyDeckFilter = deckId;
    this.studyDeckFilterSelect.value = deckId;
    this.studyBatchIndex = batchIndex;
    this.studyBatchSize = batchSize;
    this.studyFilterSelect.value = 'all';
    this.studyStatusFilter = 'all';
    this.switchTab('study');
  }

  changeDeckBatchSize(deckId, newSize) {
    StorageManager.setDeckBatchSize(deckId, parseInt(newSize, 10));
    this.renderDecksView();
    if (this.studyDeckFilter === deckId) {
      this.applyStudyFilter();
    }
  }

  confirmResetDeck(deckId) {
    const deck = this.allDecks.find(d => d.id === deckId);
    if (!deck) return;

    const cardsInDeck = this.allCards.filter(c => c.deckId === deckId);
    if (cardsInDeck.length === 0) {
      Toast.show('Bộ từ vựng này chưa có thẻ từ nào để đặt lại.', 'info');
      return;
    }

    const confirmed = confirm(
      `Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ của bộ sưu tập:\n"${deck.name}" (${cardsInDeck.length} từ)?\n\n` +
      `• Tất cả các từ trong bộ này sẽ được chuyển về trạng thái "Chưa ôn" (Mốc 1).\n` +
      `• Số lần ôn tập, số lần làm đúng và làm sai sẽ được đưa về 0.\n` +
      `• Các câu thuộc bộ này trong danh sách "Cần ôn lại" sẽ được dọn dẹp.\n\n` +
      `Thao tác này giúp bạn học lại từ đầu bộ sưu tập này!`
    );

    if (confirmed) {
      const resetCount = StorageManager.resetDeckProgress(deckId);
      this.refreshAllData();
      Toast.show(`Đã đặt lại tiến độ ${resetCount} từ trong "${deck.name}"! Bạn có thể học lại từ đầu.`, 'success', 3000);
    }
  }

  openDeckModal(deck = null) {
    if (deck) {
      this.modalDeckTitle.innerHTML = `<i data-lucide="edit-3" class="w-4 h-4 text-brand-500"></i><span>Chỉnh Sửa Bộ Sưu Tập</span>`;
      this.modalDeckId.value = deck.id;
      this.modalDeckName.value = deck.name;
      this.modalDeckDesc.value = deck.description || '';
      const colorRadio = document.querySelector(`input[name="deckColor"][value="${deck.color || 'indigo'}"]`);
      if (colorRadio) colorRadio.checked = true;
    } else {
      this.modalDeckTitle.innerHTML = `<i data-lucide="folder-plus" class="w-4 h-4 text-brand-500"></i><span>Tạo Bộ Sưu Tập Mới</span>`;
      this.modalDeckId.value = '';
      this.modalDeckName.value = '';
      this.modalDeckDesc.value = '';
      const defRadio = document.querySelector(`input[name="deckColor"][value="indigo"]`);
      if (defRadio) defRadio.checked = true;
    }
    this.modalDeck.classList.remove('hidden');
    this.modalDeck.classList.add('flex');
    this.modalDeckName.focus();
    if (window.lucide) lucide.createIcons();
  }

  closeDeckModal() {
    this.modalDeck.classList.add('hidden');
    this.modalDeck.classList.remove('flex');
  }

  editDeck(id) {
    const deck = this.allDecks.find(d => d.id === id);
    if (deck) this.openDeckModal(deck);
  }

  deleteDeck(id) {
    try {
      if (confirm('Bạn có chắc chắn muốn xóa bộ từ vựng này? Các từ bên trong sẽ được chuyển sang bộ từ khác.')) {
        StorageManager.deleteDeck(id);
        this.refreshAllData();
        Toast.show('Đã xóa bộ từ vựng', 'info');
      }
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  }

  handleSaveDeck(e) {
    e.preventDefault();
    const id = this.modalDeckId.value;
    const name = this.modalDeckName.value.trim();
    const desc = this.modalDeckDesc.value.trim();
    const color = document.querySelector('input[name="deckColor"]:checked')?.value || 'indigo';

    if (!name) return;

    if (id) {
      StorageManager.updateDeck(id, { name, description: desc, color });
      Toast.show('Đã cập nhật bộ sưu tập', 'success');
    } else {
      StorageManager.createDeck(name, desc, color);
      Toast.show('Đã tạo bộ sưu tập mới', 'success');
    }

    this.closeDeckModal();
    this.refreshAllData();
  }

  // ==========================================================================
  // VIEW 3: SMART ADD WORD & BULK IMPORT
  // ==========================================================================
  switchAddSubtab(subtab) {
    if (subtab === 'single') {
      this.subtabAddSingle.classList.add('bg-brand-600', 'text-white', 'shadow-md');
      this.subtabAddSingle.classList.remove('text-slate-500', 'dark:text-slate-400');
      this.subtabAddBulk.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
      this.subtabAddBulk.classList.add('text-slate-500', 'dark:text-slate-400');
      this.panelAddSingle.classList.remove('hidden');
      this.panelAddBulk.classList.add('hidden');
    } else {
      this.subtabAddBulk.classList.add('bg-brand-600', 'text-white', 'shadow-md');
      this.subtabAddBulk.classList.remove('text-slate-500', 'dark:text-slate-400');
      this.subtabAddSingle.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
      this.subtabAddSingle.classList.add('text-slate-500', 'dark:text-slate-400');
      this.panelAddBulk.classList.remove('hidden');
      this.panelAddSingle.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  async handleWordLookup(e) {
    e.preventDefault();
    const word = this.inputLookupWord.value.trim();
    if (!word) return;

    this.btnTriggerLookup.disabled = true;
    this.lookupLoading.classList.remove('hidden');
    this.lookupResultCard.classList.add('hidden');

    try {
      const data = await DictionaryService.lookupWord(word);

      this.editWord.value = data.word;
      this.editPhonetic.value = data.phonetic || '';
      this.editPartOfSpeech.value = data.partOfSpeech || 'noun';
      this.editMeaning.value = data.vietnameseMeaning || '';
      this.editExampleEn.value = data.exampleEn || '';
      this.editExampleVi.value = data.exampleVi || '';
      this.editDistractor1.value = data.distractors[0] || '';
      this.editDistractor2.value = data.distractors[1] || '';
      this.editDistractor3.value = data.distractors[2] || '';
      this.editAudioUrl.value = data.audioUrl || '';

      this.lookupResultCard.classList.remove('hidden');
      if (data.vietnameseMeaning) {
        Toast.show('Đã tra cứu thành công! Bạn có thể chỉnh sửa trước khi lưu.', 'success');
      } else {
        Toast.show('Đã lấy phiên âm & phát âm. Vui lòng nhập nghĩa tiếng Việt.', 'info');
        setTimeout(() => this.editMeaning.focus(), 250);
      }
    } catch (err) {
      Toast.show('Không thể tra từ này: ' + err.message, 'error');
    } finally {
      this.lookupLoading.classList.add('hidden');
      this.btnTriggerLookup.disabled = false;
    }
  }

  saveNewCardFromLookup() {
    const word = this.editWord.value.trim();
    const meaning = this.editMeaning.value.trim();
    if (!word || !meaning) {
      Toast.show('Vui lòng nhập từ và nghĩa tiếng Việt.', 'error');
      return;
    }

    const newCard = {
      deckId: this.addWordDeckSelect.value,
      word,
      phonetic: this.editPhonetic.value.trim(),
      partOfSpeech: this.editPartOfSpeech.value,
      vietnameseMeaning: meaning,
      exampleEn: this.editExampleEn.value.trim(),
      exampleVi: this.editExampleVi.value.trim(),
      distractors: [
        this.editDistractor1.value.trim(),
        this.editDistractor2.value.trim(),
        this.editDistractor3.value.trim()
      ].filter(Boolean),
      audioUrl: this.editAudioUrl.value.trim()
    };

    StorageManager.addCard(newCard);
    this.refreshAllData();
    this.lookupResultCard.classList.add('hidden');
    this.inputLookupWord.value = '';
    Toast.show(`Đã lưu "${word}" vào bộ từ vựng!`, 'success');
  }

  handleBulkFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.bulkSelectedFilename.textContent = `Đã chọn: ${file.name}`;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.textareaBulkWords.value = event.target.result;
    };
    reader.readAsText(file);
  }

  async handleStartBulkImport() {
    const text = this.textareaBulkWords.value.trim();
    if (!text) {
      Toast.show('Vui lòng dán danh sách từ hoặc tải file.', 'error');
      return;
    }

    // Support both single words and "Word - Meaning" / "Word \t Meaning" / "Word : Meaning"
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      Toast.show('Không tìm thấy dòng từ vựng nào.', 'error');
      return;
    }

    const itemsToProcess = [];
    lines.forEach(line => {
      let word = line;
      let meaning = '';

      if (line.includes('\t')) {
        const parts = line.split('\t');
        word = parts[0].trim();
        meaning = parts.slice(1).join('\t').trim();
      } else if (line.includes(' - ')) {
        const parts = line.split(' - ');
        word = parts[0].trim();
        meaning = parts.slice(1).join(' - ').trim();
      } else if (line.includes(' : ')) {
        const parts = line.split(' : ');
        word = parts[0].trim();
        meaning = parts.slice(1).join(' : ').trim();
      } else if (line.includes(':') && !line.startsWith('http')) {
        const parts = line.split(':');
        word = parts[0].trim();
        meaning = parts.slice(1).join(':').trim();
      } else if (line.includes(' = ')) {
        const parts = line.split(' = ');
        word = parts[0].trim();
        meaning = parts.slice(1).join(' = ').trim();
      }

      if (word) {
        itemsToProcess.push({ word, customMeaning: meaning });
      }
    });

    if (itemsToProcess.length === 0) {
      Toast.show('Không tìm thấy từ vựng hợp lệ.', 'error');
      return;
    }

    this.btnStartBulkAi.disabled = true;
    this.bulkProgressContainer.classList.remove('hidden');
    this.bulkResultsContainer.classList.add('hidden');
    this.bulkBatchResults = [];

    const total = itemsToProcess.length;
    for (let i = 0; i < total; i++) {
      const itemReq = itemsToProcess[i];
      const pct = Math.round(((i + 1) / total) * 100);
      this.bulkProgressPct.textContent = `${pct}%`;
      this.bulkProgressBarFill.style.width = `${pct}%`;

      try {
        const item = await DictionaryService.lookupWord(itemReq.word);
        if (itemReq.customMeaning) {
          item.vietnameseMeaning = itemReq.customMeaning;
          item.distractors = DictionaryService.generateDistractors(item.vietnameseMeaning);
        }
        this.bulkBatchResults.push(item);
      } catch (e) {
        this.bulkBatchResults.push({
          word: itemReq.word,
          phonetic: '',
          partOfSpeech: 'noun',
          vietnameseMeaning: itemReq.customMeaning || '',
          exampleEn: '',
          exampleVi: '',
          distractors: DictionaryService.generateDistractors(itemReq.customMeaning || ''),
          audioUrl: ''
        });
      }
    }

    this.bulkProgressContainer.classList.add('hidden');
    this.btnStartBulkAi.disabled = false;
    this.bulkResultsContainer.classList.remove('hidden');
    this.bulkCountBadge.textContent = `${this.bulkBatchResults.length} từ`;

    this.bulkCardsList.innerHTML = this.bulkBatchResults.map((item, idx) => `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-surface-border flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-slate-900 dark:text-white text-sm">${item.word}</span>
          <span class="font-mono text-slate-400 ml-1.5">${item.phonetic}</span>
          <div class="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">${item.vietnameseMeaning || '<em class="text-amber-500 font-normal">Chưa có nghĩa</em>'}</div>
        </div>
        <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand-500/10 text-brand-500 font-bold">${item.partOfSpeech}</span>
      </div>
    `).join('');

    Toast.show(`Đã phân tích xong ${this.bulkBatchResults.length} từ!`, 'success');
  }

  saveBulkCards() {
    if (!this.bulkBatchResults || this.bulkBatchResults.length === 0) return;
    const targetDeckId = this.bulkAddDeckSelect.value;

    this.bulkBatchResults.forEach(item => {
      StorageManager.addCard({
        deckId: targetDeckId,
        ...item
      });
    });

    this.refreshAllData();
    this.bulkResultsContainer.classList.add('hidden');
    this.textareaBulkWords.value = '';
    this.bulkSelectedFilename.textContent = '';
    Toast.show(`Đã lưu ${this.bulkBatchResults.length} từ vựng vào bộ sưu tập!`, 'success');
    this.switchTab('study');
  }

  // ==========================================================================
  // VIEW 4: VOCABULARY LIBRARY (MANAGER)
  // ==========================================================================
  renderManagerCards() {
    const search = this.managerSearch.value.trim().toLowerCase();
    const deckFilter = this.managerDeckFilter.value;
    const activeFilterBtn = document.querySelector('.mgr-filter.active');
    const statusFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';

    let list = [...this.allCards];

    // Search query
    if (search) {
      list = list.filter(c => 
        c.word.toLowerCase().includes(search) || 
        c.vietnameseMeaning.toLowerCase().includes(search)
      );
    }

    // Deck filter
    if (deckFilter !== 'all') {
      list = list.filter(c => c.deckId === deckFilter);
    }

    // Status filter
    if (statusFilter === 'due') {
      list = list.filter(c => SRSEngine.isDueToday(c));
    } else if (statusFilter === 'learning') {
      list = list.filter(c => VocabMasterApp.getCardStatus(c) === 'reviewing' || VocabMasterApp.getCardStatus(c) === 'unstudied');
    } else if (statusFilter === 'mastered') {
      list = list.filter(c => VocabMasterApp.getCardStatus(c) === 'mastered');
    } else if (statusFilter === 'mistakes') {
      const mistakeIds = StorageManager.getMistakeCardIds();
      list = list.filter(c => mistakeIds.includes(c.id));
    }

    // Counts
    const mistakeIds = StorageManager.getMistakeCardIds();
    this.countMgrAll.textContent = this.allCards.length;
    this.countMgrDue.textContent = this.allCards.filter(c => SRSEngine.isDueToday(c)).length;
    this.countMgrLearning.textContent = this.allCards.filter(c => !c.mastered).length;
    this.countMgrMastered.textContent = this.allCards.filter(c => c.mastered).length;
    if (this.countMgrMistakes) {
      this.countMgrMistakes.textContent = mistakeIds.length;
    }

    if (list.length === 0) {
      this.managerCardsGrid.innerHTML = '';
      this.managerEmpty.classList.remove('hidden');
      return;
    }

    this.managerEmpty.classList.add('hidden');
    this.managerCardsGrid.innerHTML = list.map(card => {
      const deck = this.allDecks.find(d => d.id === card.deckId) || { name: 'Chủ đề' };
      const srsLevel = card.level || 1;
      const isDue = SRSEngine.isDueToday(card);
      const isMistake = StorageManager.isMistake(card.id);

      return `
        <div class="p-4 rounded-2xl bg-white dark:bg-surface-card border ${isMistake ? 'border-rose-500/50 bg-rose-500/[0.03]' : isDue ? 'border-amber-500/50 dark:border-amber-500/50' : 'border-slate-200 dark:border-surface-border'} shadow-sm hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-surface-border/60">
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300">${deck.name}</span>
              <div class="flex items-center space-x-1.5">
                ${isMistake ? `<span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">⚠️ Cần ôn lại</span>` : ''}
                ${SRSEngine.getLevelBadgeHtml(srsLevel)}
              </div>
            </div>

            <div class="flex items-baseline justify-between mt-2">
              <h4 class="font-extrabold text-base text-slate-900 dark:text-white">${card.word}</h4>
              <span class="font-mono text-xs text-slate-400">${card.phonetic || ''}</span>
            </div>

            <div class="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">${card.vietnameseMeaning}</div>
            <p class="text-xs italic text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">"${card.exampleEn || ''}"</p>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-surface-border/60 text-xs">
            <span class="text-[11px] font-mono ${isDue ? 'text-amber-500 font-bold' : 'text-slate-400'}">
              ${isDue ? '⚡ Cần ôn hôm nay' : `Ôn: ${card.nextReviewDate || 'Chưa học'}`}
            </span>

            <div class="flex items-center space-x-1">
              ${isMistake ? `
                <button onclick="window.app.removeSingleMistake('${card.id}')" title="Xóa khỏi danh sách câu sai" class="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-all">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
              <button onclick="window.app.toggleMasteredCard('${card.id}')" title="${card.mastered ? 'Đã thuộc vững (Bấm để chuyển về đang ôn)' : 'Đánh dấu đã thuộc vững (+30 XP)'}" class="p-1.5 rounded-lg ${card.mastered ? 'text-amber-500 bg-amber-500/15' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'} transition-all">
                <i data-lucide="star" class="w-3.5 h-3.5 ${card.mastered ? 'fill-amber-500' : ''}"></i>
              </button>
              <button onclick="window.app.audio.playWordPronunciation('${card.word}', '${card.audioUrl}')" title="Phát âm" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.app.openEditCardModal('${card.id}')" title="Sửa" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.app.deleteCard('${card.id}')" title="Xóa" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  openEditCardModal(cardId) {
    const card = this.allCards.find(c => c.id === cardId);
    if (!card) return;

    this.modalCardId.value = card.id;
    this.modalDeckSelect.value = card.deckId;
    this.modalSrsLevel.value = String(card.level || 1);
    this.modalWord.value = card.word;
    this.modalPhonetic.value = card.phonetic || '';
    this.modalMeaning.value = card.vietnameseMeaning;
    this.modalExampleEn.value = card.exampleEn || '';
    this.modalExampleVi.value = card.exampleVi || '';

    this.modalEditCard.classList.remove('hidden');
    this.modalEditCard.classList.add('flex');
    if (window.lucide) lucide.createIcons();
  }

  closeEditModal() {
    this.modalEditCard.classList.add('hidden');
    this.modalEditCard.classList.remove('flex');
  }

  handleSaveEditCard(e) {
    e.preventDefault();
    const id = this.modalCardId.value;
    const card = this.allCards.find(c => c.id === id);
    if (!card) return;

    card.deckId = this.modalDeckSelect.value;
    card.level = parseInt(this.modalSrsLevel.value, 10);
    card.word = this.modalWord.value.trim();
    card.phonetic = this.modalPhonetic.value.trim();
    card.vietnameseMeaning = this.modalMeaning.value.trim();
    card.exampleEn = this.modalExampleEn.value.trim();
    card.exampleVi = this.modalExampleVi.value.trim();

    StorageManager.updateCard(id, card);
    this.closeEditModal();
    this.refreshAllData();
    Toast.show('Đã lưu thay đổi thẻ từ vựng', 'success');
  }

  deleteCard(cardId) {
    if (confirm('Bạn có muốn xóa thẻ từ này?')) {
      StorageManager.deleteCard(cardId);
      this.refreshAllData();
      Toast.show('Đã xóa thẻ từ vựng', 'info');
    }
  }

  handleImportJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        StorageManager.importDataFromJSON(event.target.result);
        this.refreshAllData();
        Toast.show('Đã khôi phục toàn bộ dữ liệu thành công!', 'success');
      } catch (err) {
        Toast.show('Lỗi đọc file JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ==========================================================================
  // GAMIFICATION: QUESTS MODAL & LEVEL UP
  // ==========================================================================
  openQuestsModal() {
    const quests = GamificationEngine.getDailyQuests();
    this.questsList.innerHTML = quests.map(q => {
      const isComplete = q.current >= q.target;
      const pct = Math.min(100, Math.round((q.current / q.target) * 100));

      return `
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-surface-border space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-800 dark:text-white">${q.title}</span>
            <span class="text-xs font-mono font-bold text-amber-500">+${q.exp} XP</span>
          </div>

          <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-amber-400 to-brand-500" style="width: ${pct}%"></div>
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <span class="font-mono text-[11px] text-slate-500 dark:text-slate-400">Tiến độ: ${q.current}/${q.target}</span>
            ${
              q.claimed
                ? `<span class="text-[11px] font-semibold text-emerald-500">Đã nhận thưởng</span>`
                : isComplete
                ? `<button onclick="window.app.claimQuest('${q.id}')" class="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-[11px] shadow-md shadow-amber-500/20 transition-all">Nhận ${q.exp} XP</button>`
                : `<span class="text-[11px] text-slate-400">Chưa xong</span>`
            }
          </div>
        </div>
      `;
    }).join('');

    this.modalQuests.classList.remove('hidden');
    this.modalQuests.classList.add('flex');
    if (window.lucide) lucide.createIcons();
  }

  closeQuestsModal() {
    this.modalQuests.classList.add('hidden');
    this.modalQuests.classList.remove('flex');
  }

  claimQuest(questId) {
    const res = GamificationEngine.claimQuest(questId);
    if (res.success) {
      this.audio.playSuccess();
      this.confetti.fire(1500);
      Toast.show(`Chúc mừng! Bạn nhận được +${res.expGained} XP!`, 'success');
      if (res.expResult.isLevelUp) {
        this.triggerLevelUpCelebration(res.expResult);
      }
      this.updateHeaderStats();
      this.openQuestsModal(); // re-render
    }
  }

  triggerLevelUpCelebration(expRes) {
    this.audio.playLevelUp();
    this.confetti.fire(3500);

    this.modalLevelupTitle.textContent = `Level ${expRes.newLevel}: ${expRes.title}`;
    this.modalLevelup.classList.remove('hidden');
    this.modalLevelup.classList.add('flex');
    if (window.lucide) lucide.createIcons();
  }

  // ==========================================================================
  // PRACTICE HISTORY MODAL
  // ==========================================================================
  openHistoryModal() {
    this.renderHistoryModal();
    if (this.modalHistory) {
      this.modalHistory.classList.remove('hidden');
      this.modalHistory.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  }

  closeHistoryModal() {
    if (this.modalHistory) {
      this.modalHistory.classList.add('hidden');
      this.modalHistory.classList.remove('flex');
    }
  }

  renderHistoryModal() {
    if (!this.historySessionsList) return;
    const history = StorageManager.getPracticeHistory();

    if (history.length === 0) {
      this.historySessionsList.innerHTML = `
        <div class="py-10 text-center text-xs text-slate-400">
          <i data-lucide="calendar" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
          <p>Chưa có lịch sử phiên luyện tập nào được ghi nhận.</p>
        </div>
      `;
      return;
    }

    this.historySessionsList.innerHTML = history.map((session, idx) => `
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-surface-border flex items-center justify-between text-xs">
        <div>
          <div class="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <span>Phiên #${history.length - idx}</span>
            <span class="text-[10px] font-mono text-slate-400 font-normal">(${session.date || ''})</span>
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Đúng: <strong class="text-emerald-500">${session.correct || 0}</strong> • Sai: <strong class="text-rose-500">${session.wrong || 0}</strong> • Tổng: ${session.total || 0}
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-extrabold text-brand-600 dark:text-brand-400">${session.accuracy || 100}%</span>
          <div class="text-[10px] text-slate-400">Độ chính xác</div>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // INTERACTIVE VOCABULARY LEARNING SESSION (HỌC TỪ VỰNG TƯƠNG TÁC)
  // ==========================================================================
  openInteractiveSetup(targetDeckId = null) {
    if (this.interactiveSetupScreen) this.interactiveSetupScreen.classList.remove('hidden');
    if (this.interactiveActiveScreen) this.interactiveActiveScreen.classList.add('hidden');

    if (targetDeckId && this.interactiveDeckSelect) {
      this.interactiveDeckSelect.value = targetDeckId;
    }

    // Update due cards count
    const dueCount = this.allCards.filter(c => SRSEngine.isDueToday(c)).length;
    if (this.badgeInteractiveDueCount) {
      this.badgeInteractiveDueCount.textContent = `${dueCount} từ đến hạn`;
    }

    // Update SRS level counts
    this.updateSrsLevelCounts();
    this.updateInteractiveSetupPreview();
    if (window.lucide) lucide.createIcons();
  }

  updateSrsLevelCounts() {
    const deckId = this.interactiveDeckSelect ? this.interactiveDeckSelect.value : 'all';
    let pool = deckId === 'all' ? this.allCards : this.allCards.filter(c => c.deckId === deckId);

    const counts = {
      1: pool.filter(c => (c.level || 1) === 1).length,
      2: pool.filter(c => c.level === 2).length,
      3: pool.filter(c => c.level === 3).length,
      4: pool.filter(c => c.level === 4 || c.level === 5).length,
      5: pool.filter(c => (c.level || 1) >= 6 || c.mastered).length
    };

    [1, 2, 3, 4, 5].forEach(lvl => {
      const el = document.getElementById('count-srs-' + lvl);
      if (el) el.textContent = counts[lvl] || 0;
    });
  }

  setInteractiveSource(source) {
    this.interactiveSource = source;
    if (source === 'srs') {
      if (this.tabSourceSrs) {
        this.tabSourceSrs.className = 'py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all bg-white dark:bg-surface-card text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-sm';
      }
      if (this.tabSourceCustom) {
        this.tabSourceCustom.className = 'py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      }
    } else {
      if (this.tabSourceCustom) {
        this.tabSourceCustom.className = 'py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all bg-white dark:bg-surface-card text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-sm';
      }
      if (this.tabSourceSrs) {
        this.tabSourceSrs.className = 'py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      }
    }
    this.updateInteractiveSetupPreview();
  }

  toggleAllSrsLevels() {
    const allChecked = this.chkSrsLevels.every(chk => !chk || chk.checked);
    this.chkSrsLevels.forEach((chk, idx) => {
      if (chk) {
        chk.checked = allChecked ? (idx === 0) : true;
      }
    });
    this.updateInteractiveSetupPreview();
  }

  setInteractiveQuestionType(qType) {
    this.interactiveQuestionType = qType;
    this.interactiveQuestionTypeCards.forEach(card => {
      const match = card.dataset.qtype === qType;
      card.classList.toggle('active', match);
      card.classList.toggle('border-2', match);
      card.classList.toggle('border-violet-600', match);
      card.classList.toggle('dark:border-violet-500', match);
      card.classList.toggle('bg-violet-50/50', match);
      card.classList.toggle('dark:bg-violet-950/20', match);
      card.classList.toggle('shadow-sm', match);

      if (!match) {
        card.className = 'qtype-card p-4 rounded-2xl border border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface-dark/50 hover:border-violet-400 cursor-pointer transition-all flex items-start space-x-3.5';
      }
    });
    this.updateInteractiveSetupPreview();
  }

  getInteractiveCandidateCards() {
    const deckId = this.interactiveDeckSelect ? this.interactiveDeckSelect.value : 'all';
    let pool = deckId === 'all' ? [...this.allCards] : this.allCards.filter(c => c.deckId === deckId);

    if (this.interactiveSource === 'srs') {
      const dueCards = pool.filter(c => SRSEngine.isDueToday(c));
      if (dueCards.length > 0) return dueCards;
      return pool.filter(c => !c.mastered);
    }

    // Custom level filter
    const checkedLevels = [];
    if (this.chkSrsLevels[0] && this.chkSrsLevels[0].checked) checkedLevels.push(1);
    if (this.chkSrsLevels[1] && this.chkSrsLevels[1].checked) checkedLevels.push(2);
    if (this.chkSrsLevels[2] && this.chkSrsLevels[2].checked) checkedLevels.push(3);
    if (this.chkSrsLevels[3] && this.chkSrsLevels[3].checked) { checkedLevels.push(4); checkedLevels.push(5); }
    if (this.chkSrsLevels[4] && this.chkSrsLevels[4].checked) { checkedLevels.push(6); }

    let result = pool.filter(c => {
      const lvl = c.level || 1;
      if (checkedLevels.includes(6) && (c.mastered || lvl >= 6)) return true;
      return checkedLevels.includes(lvl);
    });

    if (result.length === 0) result = pool.slice(0, 10);
    return result;
  }

  updateInteractiveSetupPreview() {
    this.updateSrsLevelCounts();
    const candidates = this.getInteractiveCandidateCards();
    const limitVal = this.interactiveSessionLimit ? this.interactiveSessionLimit.value : '10';
    const limit = limitVal === 'all' ? candidates.length : parseInt(limitVal, 10) || 10;
    const finalCards = candidates.slice(0, limit);

    let numQuestions = finalCards.length;
    if (this.interactiveQuestionType === 'both') {
      numQuestions = finalCards.length * 2;
    }

    if (this.interactivePreviewCountText) {
      this.interactivePreviewCountText.textContent = `Ước tính: ${finalCards.length} từ • ${numQuestions} câu hỏi`;
    }
    const btnText = document.getElementById('btn-start-interactive-text');
    if (btnText) {
      btnText.textContent = `Học Từ Vựng (${finalCards.length} từ • ${numQuestions} câu)`;
    }
  }

  startInteractiveSession() {
    const candidates = this.getInteractiveCandidateCards();
    if (candidates.length === 0) {
      Toast.show('Không tìm thấy từ vựng nào phù hợp với bộ lọc đã chọn.', 'error');
      return;
    }

    const limitVal = this.interactiveSessionLimit ? this.interactiveSessionLimit.value : '10';
    const limit = limitVal === 'all' ? candidates.length : parseInt(limitVal, 10) || 10;
    const selectedCards = candidates.slice(0, limit);

    // Build session queue
    const queue = [];
    selectedCards.forEach(card => {
      if (this.interactiveQuestionType === 'both') {
        queue.push({
          id: 'q-' + card.id + '-listen-' + Math.random().toString(36).substr(2, 4),
          card,
          type: 'listen',
          answered: false,
          isCorrect: false,
          userAnswer: ''
        });
        queue.push({
          id: 'q-' + card.id + '-def-' + Math.random().toString(36).substr(2, 4),
          card,
          type: 'definition',
          answered: false,
          isCorrect: false,
          userAnswer: ''
        });
      } else if (this.interactiveQuestionType === 'shuffle') {
        const randType = Math.random() < 0.5 ? 'listen' : 'definition';
        queue.push({
          id: 'q-' + card.id + '-' + randType + '-' + Math.random().toString(36).substr(2, 4),
          card,
          type: randType,
          answered: false,
          isCorrect: false,
          userAnswer: ''
        });
      } else if (this.interactiveQuestionType === 'listen') {
        queue.push({
          id: 'q-' + card.id + '-listen-' + Math.random().toString(36).substr(2, 4),
          card,
          type: 'listen',
          answered: false,
          isCorrect: false,
          userAnswer: ''
        });
      } else {
        queue.push({
          id: 'q-' + card.id + '-def-' + Math.random().toString(36).substr(2, 4),
          card,
          type: 'definition',
          answered: false,
          isCorrect: false,
          userAnswer: ''
        });
      }
    });

    // Shuffle queue with Fisher-Yates
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    this.interactiveSessionQueue = queue;
    this.currentInteractiveIndex = 0;
    this.interactiveSessionStats = {
      total: queue.length,
      correct: 0,
      wrong: 0,
      mistakes: [],
      exp: 0
    };

    // Check continuous mode Fullscreen
    if (this.chkInteractiveContinuousMode && this.chkInteractiveContinuousMode.checked) {
      this.toggleFullscreenMode(true);
    }

    // Sync live auto play checkbox
    if (this.chkInteractiveAutoPlayLive && this.chkInteractiveAutoPlayAfter) {
      this.chkInteractiveAutoPlayLive.checked = this.chkInteractiveAutoPlayAfter.checked;
    }

    // Switch view screen
    if (this.interactiveSetupScreen) this.interactiveSetupScreen.classList.add('hidden');
    if (this.interactiveActiveScreen) this.interactiveActiveScreen.classList.remove('hidden');

    this.renderInteractiveQuestion();
  }

  renderInteractiveQuestion() {
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) {
      this.finishInteractiveSession();
      return;
    }

    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    const card = q.card;
    const total = this.interactiveSessionQueue.length;
    const currentNum = this.currentInteractiveIndex + 1;
    const deck = this.allDecks.find(d => d.id === card.deckId) || { name: 'Chủ đề' };

    // Update Top bar stats
    if (this.interactiveQuestionCounter) {
      this.interactiveQuestionCounter.textContent = `Câu hỏi ${currentNum}/${total}`;
    }

    const mastery = DiffEngine.getMasteryInfo(card);
    if (this.interactiveMasteryDot) this.interactiveMasteryDot.style.backgroundColor = mastery.color;
    if (this.interactiveMasteryText) this.interactiveMasteryText.textContent = `${mastery.score} • ${mastery.name}`;

    const pct = Math.round(((currentNum - 1) / total) * 100);
    if (this.interactiveProgressPct) this.interactiveProgressPct.textContent = `${pct}%`;
    if (this.interactiveProgressBar) this.interactiveProgressBar.style.width = `${pct}%`;
    if (this.interactiveDeckBadge) this.interactiveDeckBadge.textContent = deck.name;

    // Reset interaction state
    this.interactiveIsAnswerLocked = false;
    if (this.interactiveInputAnswer) {
      this.interactiveInputAnswer.value = '';
      this.interactiveInputAnswer.disabled = false;
    }
    if (this.btnInteractiveSubmit) {
      this.btnInteractiveSubmit.disabled = true;
    }

    // Reset feedback containers
    if (this.interactiveSubmitControls) this.interactiveSubmitControls.classList.remove('hidden');
    if (this.interactiveFeedbackContainer) this.interactiveFeedbackContainer.classList.add('hidden');
    if (this.interactiveCorrectBanner) this.interactiveCorrectBanner.classList.add('hidden');
    if (this.interactiveWrongBanner) this.interactiveWrongBanner.classList.add('hidden');
    if (this.interactiveCharDiffBox) this.interactiveCharDiffBox.classList.add('hidden');
    if (this.interactiveForceRetypeBox) this.interactiveForceRetypeBox.classList.add('hidden');
    if (this.btnInteractiveNextWord) this.btnInteractiveNextWord.classList.add('hidden');
    if (this.interactiveRightKnowledgeFull) this.interactiveRightKnowledgeFull.classList.add('hidden');

    // Update length hint
    this.updateInteractiveLengthHintUI();

    // Setup Question-specific Column views
    if (q.type === 'listen') {
      if (this.interactiveQuestionTypeBadge) {
        this.interactiveQuestionTypeBadge.innerHTML = `<i data-lucide="headphones" class="w-3.5 h-3.5"></i><span>Nghe và viết từ vựng</span>`;
      }
      if (this.interactiveRightListeningWaiting) this.interactiveRightListeningWaiting.classList.remove('hidden');
      if (this.interactiveRightDefinitionPreview) this.interactiveRightDefinitionPreview.classList.add('hidden');
      if (this.interactiveTipText) {
        this.interactiveTipText.textContent = 'Nhấn Ctrl để nghe lại âm thanh từ vựng bất cứ lúc nào. Đồng hồ sẽ đếm ngược sau khi phát âm xong.';
      }

      this.interactiveTimerRemaining = 28;
      this.updateTimerDisplay();

      // Auto play audio of word
      this.audio.playWordPronunciation(
        card.word,
        card.audioUrl,
        () => {},
        () => {
          if (!this.interactiveIsAnswerLocked) {
            this.startCountdownTimer(28);
          }
        }
      );
    } else {
      // Definition & Meaning Question
      if (this.interactiveQuestionTypeBadge) {
        this.interactiveQuestionTypeBadge.innerHTML = `<i data-lucide="book-open" class="w-3.5 h-3.5"></i><span>Định nghĩa & Nghĩa</span>`;
      }
      if (this.interactiveRightListeningWaiting) this.interactiveRightListeningWaiting.classList.add('hidden');
      if (this.interactiveRightDefinitionPreview) this.interactiveRightDefinitionPreview.classList.remove('hidden');

      if (this.previewPartOfSpeech) this.previewPartOfSpeech.textContent = card.partOfSpeech || 'noun';
      if (this.previewDefinitionEn) this.previewDefinitionEn.textContent = DictionaryService.getDefinitionEn(card);
      if (this.previewMeaningVi) this.previewMeaningVi.textContent = card.vietnameseMeaning || '';
      if (this.interactiveTipText) {
        this.interactiveTipText.textContent = 'Đọc định nghĩa tiếng Anh & nghĩa tiếng Việt để gõ từ tiếng Anh. Nhấn Enter để gửi đáp án hoặc ESC nếu không nhớ.';
      }

      this.startCountdownTimer(28);
    }

    // Populate Right Column Full Knowledge (Hidden until answered)
    if (this.fullWordTitle) this.fullWordTitle.textContent = card.word;
    if (this.fullPosBadge) this.fullPosBadge.textContent = card.partOfSpeech || 'noun';
    if (this.fullPhoneticText) this.fullPhoneticText.textContent = card.phonetic || '';
    if (this.fullDefinitionEnContent) this.fullDefinitionEnContent.textContent = DictionaryService.getDefinitionEn(card);
    if (this.fullMeaningViContent) this.fullMeaningViContent.textContent = card.vietnameseMeaning || '';

    // Render bilingual examples list
    if (this.fullExamplesList) {
      if (card.exampleEn) {
        this.fullExamplesList.innerHTML = `
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-surface-border space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-violet-600 dark:text-violet-400">Ví dụ câu:</span>
              <div class="flex items-center space-x-1.5">
                <button type="button" title="Nghe câu ví dụ" class="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all" onclick="window.app.audio.fallbackSpeechSynthesis('${card.exampleEn.replace(/'/g, "\\'")}')">
                  <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" title="Luyện đọc câu này" class="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all" onclick="window.app.practiceSpeakingExample('${card.exampleEn.replace(/'/g, "\\'")}')">
                  <i data-lucide="mic" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-all" onclick="window.app.toggleSentenceBreakdown('full-example-en-0', '${card.exampleEn.replace(/'/g, "\\'")}')">
                  Phân tích
                </button>
              </div>
            </div>
            <div id="full-example-en-0" class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">${card.exampleEn}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 italic">${card.exampleVi || ''}</div>
          </div>
        `;
      } else {
        this.fullExamplesList.innerHTML = `<div class="text-xs text-slate-400 italic">Chưa có câu ví dụ cho từ này.</div>`;
      }
    }

    if (this.interactiveInputAnswer) {
      setTimeout(() => this.interactiveInputAnswer.focus(), 50);
    }
    if (window.lucide) lucide.createIcons();
  }

  startCountdownTimer(seconds = 28) {
    this.stopCountdownTimer();
    this.interactiveTimerRemaining = seconds;
    this.updateTimerDisplay();

    this.interactiveTimerInterval = setInterval(() => {
      this.interactiveTimerRemaining--;
      this.updateTimerDisplay();

      if (this.interactiveTimerRemaining <= 0) {
        this.stopCountdownTimer();
        this.handleInteractiveGiveUp(true);
      }
    }, 1000);
  }

  stopCountdownTimer() {
    if (this.interactiveTimerInterval) {
      clearInterval(this.interactiveTimerInterval);
      this.interactiveTimerInterval = null;
    }
  }

  updateTimerDisplay() {
    if (this.interactiveTimerText) {
      this.interactiveTimerText.textContent = `${this.interactiveTimerRemaining}s`;
    }
    if (this.interactiveCountdownTimer) {
      this.interactiveCountdownTimer.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm border transition-all ';
      if (this.interactiveTimerRemaining > 15) {
        this.interactiveCountdownTimer.className += 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
      } else if (this.interactiveTimerRemaining > 5) {
        this.interactiveCountdownTimer.className += 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
      } else {
        this.interactiveCountdownTimer.className += 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 animate-pulse';
      }
    }
  }

  playInteractiveCurrentWord() {
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    if (!q || !q.card) return;
    this.audio.playWordPronunciation(q.card.word, q.card.audioUrl);
  }

  playInteractiveCurrentExample() {
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    if (!q || !q.card || !q.card.exampleEn) return;
    this.audio.fallbackSpeechSynthesis(q.card.exampleEn);
  }

  handleInteractiveInput(e) {
    const val = (e.target.value || '').trim();
    if (this.btnInteractiveSubmit) {
      this.btnInteractiveSubmit.disabled = val.length === 0 || this.interactiveIsAnswerLocked;
    }
    this.updateInteractiveLiveHint(e.target.value || '');
  }

  toggleLengthHint() {
    this.updateInteractiveLengthHintUI();
  }

  updateInteractiveLengthHintUI() {
    if (!this.interactiveLengthHintBox) return;
    const isChecked = this.chkInteractiveLengthHint && this.chkInteractiveLengthHint.checked;
    if (!isChecked) {
      this.interactiveLengthHintBox.classList.add('hidden');
      return;
    }

    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    if (!q || !q.card) return;

    this.interactiveLengthHintBox.classList.remove('hidden');
    const typed = this.interactiveInputAnswer ? this.interactiveInputAnswer.value : '';
    this.updateInteractiveLiveHint(typed);
  }

  updateInteractiveLiveHint(typed) {
    if (!this.interactiveLengthHintBox || this.interactiveLengthHintBox.classList.contains('hidden')) return;
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    if (!q || !q.card) return;

    const wordChars = Array.from(q.card.word);
    const typedChars = Array.from(typed);

    this.interactiveLengthHintBox.innerHTML = wordChars.map((ch, idx) => {
      const isTyped = idx < typedChars.length;
      const charToShow = isTyped ? typedChars[idx] : '_';
      return `<span class="interactive-letter-box text-slate-800 dark:text-slate-100 ${isTyped ? 'border-violet-500' : 'border-slate-300 dark:border-surface-border'}">${charToShow}</span>`;
    }).join('') + `<span class="text-[11px] font-mono text-slate-400 ml-2 self-center">(${wordChars.length} chữ cái)</span>`;
  }

  handleInteractiveSubmit() {
    if (this.interactiveIsAnswerLocked) return;
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;

    const rawAns = (this.interactiveInputAnswer ? this.interactiveInputAnswer.value : '').trim();
    if (!rawAns) return;

    this.stopCountdownTimer();
    this.interactiveIsAnswerLocked = true;
    if (this.interactiveInputAnswer) this.interactiveInputAnswer.disabled = true;

    if (this.interactiveSubmitControls) this.interactiveSubmitControls.classList.add('hidden');
    if (this.interactiveFeedbackContainer) this.interactiveFeedbackContainer.classList.remove('hidden');

    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    const card = q.card;
    const isCorrect = rawAns.toLowerCase() === card.word.trim().toLowerCase();

    q.answered = true;
    q.isCorrect = isCorrect;
    q.userAnswer = rawAns;

    if (isCorrect) {
      this.audio.playSuccess();
      if (this.interactiveCorrectBanner) this.interactiveCorrectBanner.classList.remove('hidden');
      if (this.btnInteractiveNextWord) {
        this.btnInteractiveNextWord.classList.remove('hidden');
        this.btnInteractiveNextWord.focus();
      }

      if (this.chkInteractiveAutoPlayLive && this.chkInteractiveAutoPlayLive.checked) {
        this.audio.playWordPronunciation(card.word, card.audioUrl);
      }

      this.handleCardReviewResult(card, true);
      this.interactiveSessionStats.correct++;
      this.interactiveSessionStats.exp += 15;
    } else {
      this.audio.playError();
      if (this.interactiveWrongBanner) {
        this.interactiveWrongBanner.classList.remove('hidden');
        if (this.interactiveWrongTitle) this.interactiveWrongTitle.textContent = `✗ Sai rồi - "${rawAns}"`;
      }

      const diff = DiffEngine.diffCharacters(rawAns, card.word);
      if (this.interactiveDiffUser) this.interactiveDiffUser.innerHTML = diff.userHtml;
      if (this.interactiveDiffTarget) this.interactiveDiffTarget.innerHTML = diff.targetHtml;
      if (this.interactiveCharDiffBox) this.interactiveCharDiffBox.classList.remove('hidden');

      this.setupForceRetypeBox(card.word);
      this.handleCardReviewResult(card, false);
      this.interactiveSessionStats.wrong++;
      this.interactiveSessionStats.mistakes.push(card);
    }

    // Unlock knowledge full display on right column
    if (this.interactiveRightListeningWaiting) this.interactiveRightListeningWaiting.classList.add('hidden');
    if (this.interactiveRightDefinitionPreview) this.interactiveRightDefinitionPreview.classList.add('hidden');
    if (this.interactiveRightKnowledgeFull) this.interactiveRightKnowledgeFull.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  handleInteractiveGiveUp(isTimeout = false) {
    if (this.interactiveIsAnswerLocked) return;
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;

    this.stopCountdownTimer();
    this.interactiveIsAnswerLocked = true;
    if (this.interactiveInputAnswer) this.interactiveInputAnswer.disabled = true;

    if (this.interactiveSubmitControls) this.interactiveSubmitControls.classList.add('hidden');
    if (this.interactiveFeedbackContainer) this.interactiveFeedbackContainer.classList.remove('hidden');

    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    const card = q.card;
    q.answered = true;
    q.isCorrect = false;
    q.userAnswer = isTimeout ? '(Hết thời gian)' : '(Không nhớ)';

    this.audio.playError();
    if (this.interactiveWrongBanner) {
      this.interactiveWrongBanner.classList.remove('hidden');
      if (this.interactiveWrongTitle) {
        this.interactiveWrongTitle.textContent = isTimeout ? '✗ Hết thời gian làm bài!' : '✗ Tôi không nhớ';
      }
    }

    const diff = DiffEngine.diffCharacters('', card.word);
    if (this.interactiveDiffUser) this.interactiveDiffUser.innerHTML = diff.userHtml;
    if (this.interactiveDiffTarget) this.interactiveDiffTarget.innerHTML = diff.targetHtml;
    if (this.interactiveCharDiffBox) this.interactiveCharDiffBox.classList.remove('hidden');

    this.setupForceRetypeBox(card.word);
    this.handleCardReviewResult(card, false);
    this.interactiveSessionStats.wrong++;
    this.interactiveSessionStats.mistakes.push(card);

    if (this.interactiveRightListeningWaiting) this.interactiveRightListeningWaiting.classList.add('hidden');
    if (this.interactiveRightDefinitionPreview) this.interactiveRightDefinitionPreview.classList.add('hidden');
    if (this.interactiveRightKnowledgeFull) this.interactiveRightKnowledgeFull.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  setupForceRetypeBox(expectedWord) {
    if (!this.interactiveForceRetypeBox) return;
    this.interactiveForceRetypeBox.classList.remove('hidden');
    this.interactiveForceRetypeBox.innerHTML = `
      <div class="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-500"></i>
        <span>Hãy gõ từ đúng để tiếp tục:</span>
      </div>
      <div class="flex items-center space-x-2">
        <input id="input-force-retype" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ chính xác để tiếp tục..." class="flex-1 text-sm font-semibold px-3.5 py-2.5 rounded-xl border-2 border-amber-400 bg-white dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        <button type="button" id="btn-confirm-retype" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all shadow-md shadow-amber-500/20 shrink-0">
          Kiểm tra
        </button>
      </div>
      <div id="force-retype-error" class="hidden text-xs text-rose-500 font-semibold"></div>
    `;

    const inputEl = document.getElementById('input-force-retype');
    const btnEl = document.getElementById('btn-confirm-retype');

    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleForceRetypeSubmit();
        }
      });
      setTimeout(() => inputEl.focus(), 60);
    }
    if (btnEl) {
      btnEl.addEventListener('click', () => this.handleForceRetypeSubmit());
    }
    if (this.btnInteractiveNextWord) {
      this.btnInteractiveNextWord.classList.add('hidden');
    }
  }

  handleForceRetypeSubmit() {
    const inputEl = document.getElementById('input-force-retype');
    if (!inputEl) return;
    const typed = inputEl.value.trim().toLowerCase();

    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    const target = q.card.word.trim().toLowerCase();
    const errEl = document.getElementById('force-retype-error');

    if (typed === target) {
      this.audio.playSuccess();
      if (errEl) errEl.classList.add('hidden');
      if (this.interactiveForceRetypeBox) {
        this.interactiveForceRetypeBox.innerHTML = `
          <div class="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-2">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            <span>✓ Chính xác! Bạn đã gõ lại từ hoàn toàn chuẩn.</span>
          </div>
        `;
      }
      if (this.btnInteractiveNextWord) {
        this.btnInteractiveNextWord.classList.remove('hidden');
        this.btnInteractiveNextWord.focus();
      }
      Toast.show('Đã sửa lỗi thành công! Nhấn Enter để sang câu tiếp theo.', 'success', 1800);
      if (window.lucide) lucide.createIcons();
    } else {
      inputEl.classList.add('animate-shake');
      setTimeout(() => inputEl.classList.remove('animate-shake'), 400);
      if (errEl) {
        errEl.textContent = `Chưa khớp! Hãy nhập chính xác: "${q.card.word}"`;
        errEl.classList.remove('hidden');
      }
    }
  }

  handleInteractiveNextQuestion() {
    this.currentInteractiveIndex++;
    if (this.currentInteractiveIndex < this.interactiveSessionQueue.length) {
      this.renderInteractiveQuestion();
    } else {
      this.finishInteractiveSession();
    }
  }

  handleSecondaryAction(action) {
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    const card = q.card;

    if (action === 'later') {
      this.interactiveSessionQueue.push({
        id: 'q-later-' + Date.now(),
        card,
        type: q.type,
        answered: false,
        isCorrect: false,
        userAnswer: ''
      });
      this.interactiveSessionStats.total++;
      if (this.interactiveQuestionCounter) {
        this.interactiveQuestionCounter.textContent = `Câu hỏi ${this.currentInteractiveIndex + 1}/${this.interactiveSessionQueue.length}`;
      }
      Toast.show(`Đã thêm từ "${card.word}" vào cuối phiên học để ôn lại!`, 'info', 2000);
    } else if (action === 'edit') {
      const newMeaning = prompt(`Cập nhật nghĩa tiếng Việt cho từ "${card.word}":`, card.vietnameseMeaning || '');
      if (newMeaning && newMeaning.trim()) {
        card.vietnameseMeaning = newMeaning.trim();
        StorageManager.updateCard(card.id, card);
        if (this.fullMeaningViContent) this.fullMeaningViContent.textContent = card.vietnameseMeaning;
        this.refreshAllData();
        Toast.show('Đã cập nhật nghĩa tiếng Việt thành công!', 'success', 1500);
      }
    } else if (action === 'passive') {
      Toast.show('Đã chuyển sang chế độ học thụ động (không trừ điểm SRS cho câu này).', 'info', 2000);
    } else if (action === 'report') {
      Toast.show(`Cảm ơn bạn! Đã ghi nhận báo cáo cho từ "${card.word}".`, 'info', 2000);
    }
  }

  analyzeCurrentDefinition() {
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    if (!q || !q.card) return;
    const def = DictionaryService.getDefinitionEn(q.card);
    this.toggleSentenceBreakdown('full-definition-en-content', def);
  }

  analyzeCurrentMeaning() {
    if (this.currentInteractiveIndex >= this.interactiveSessionQueue.length) return;
    const q = this.interactiveSessionQueue[this.currentInteractiveIndex];
    if (!q || !q.card) return;
    const m = q.card.vietnameseMeaning || '';
    this.toggleSentenceBreakdown('full-meaning-vi-content', m, false);
  }

  toggleSentenceBreakdown(elementId, text, isEn = true) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (el.dataset.brokenDown === 'true') {
      el.dataset.brokenDown = 'false';
      el.innerHTML = text;
      return;
    }

    el.dataset.brokenDown = 'true';
    const tokens = text.split(/(\s+|[.,!?;:()"])/);
    const html = tokens.map(t => {
      if (!t.trim() || /^[.,!?;:()"]+$/.test(t)) return t;
      const cleanWord = t.toLowerCase().replace(/[^a-z0-9'-]/g, '');
      return `<span class="interactive-token-word" onclick="window.app.playSingleToken('${cleanWord}')" title="Click để nghe phát âm '${cleanWord}'">${t}</span>`;
    }).join('');
    el.innerHTML = html;
  }

  playSingleToken(word) {
    if (!word) return;
    this.audio.fallbackSpeechSynthesis(word);
  }

  practiceSpeakingExample(exampleSentence) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      Toast.show('Trình duyệt không hỗ trợ nhận diện giọng nói SpeechRecognition.', 'info');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    Toast.show('Đang lắng nghe... Hãy đọc câu ví dụ!', 'info', 2000);

    recognition.onresult = (e) => {
      const speech = e.results[0][0].transcript;
      Toast.show(`Bạn đã đọc: "${speech}"`, 'success', 2500);
    };
    recognition.onerror = () => {
      Toast.show('Chưa nhận diện được giọng nói, vui lòng thử lại.', 'error', 1500);
    };
    recognition.start();
  }

  toggleSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      Toast.show('Trình duyệt chưa hỗ trợ nhận diện giọng nói hoặc chưa cấp quyền micro.', 'info', 2500);
      return;
    }

    if (this.isRecordingSpeech) {
      if (this.speechRecognition) this.speechRecognition.stop();
      this.isRecordingSpeech = false;
      if (this.btnInteractiveMic) this.btnInteractiveMic.classList.remove('text-rose-500', 'animate-pulse');
      return;
    }

    try {
      this.speechRecognition = new SpeechRec();
      this.speechRecognition.lang = 'en-US';
      this.speechRecognition.interimResults = false;

      this.speechRecognition.onstart = () => {
        this.isRecordingSpeech = true;
        if (this.btnInteractiveMic) this.btnInteractiveMic.classList.add('text-rose-500', 'animate-pulse');
        Toast.show('Đang lắng nghe... Hãy nói từ tiếng Anh!', 'info', 1800);
      };

      this.speechRecognition.onresult = (e) => {
        const transcript = (e.results[0][0].transcript || '').trim().toLowerCase();
        if (this.interactiveInputAnswer) {
          this.interactiveInputAnswer.value = transcript;
          this.interactiveInputAnswer.dispatchEvent(new Event('input'));
        }
        Toast.show(`Đã nhận diện: "${transcript}"`, 'success', 1500);
      };

      this.speechRecognition.onerror = () => {
        this.isRecordingSpeech = false;
        if (this.btnInteractiveMic) this.btnInteractiveMic.classList.remove('text-rose-500', 'animate-pulse');
      };

      this.speechRecognition.onend = () => {
        this.isRecordingSpeech = false;
        if (this.btnInteractiveMic) this.btnInteractiveMic.classList.remove('text-rose-500', 'animate-pulse');
      };

      this.speechRecognition.start();
    } catch (e) {
      Toast.show('Không thể khởi động micro ghi âm.', 'error');
    }
  }

  toggleFullscreenMode(force = null) {
    const target = document.documentElement;
    const isCurrently = !!document.fullscreenElement;
    const shouldBe = force !== null ? force : !isCurrently;

    if (shouldBe && !isCurrently) {
      if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
    } else if (!shouldBe && isCurrently) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  finishInteractiveSession() {
    this.stopCountdownTimer();
    this.confetti.fire(3500);
    this.audio.playLevelUp();

    const stats = this.interactiveSessionStats;
    const accuracy = Math.round((stats.correct / Math.max(1, stats.total)) * 100);

    // Save to practice history
    StorageManager.addPracticeHistory({
      date: SRSEngine.getTodayString(),
      correct: stats.correct,
      wrong: stats.wrong,
      total: stats.total,
      accuracy
    });

    // Populate summary modal
    if (this.intSumTotal) this.intSumTotal.textContent = stats.total;
    if (this.intSumCorrect) this.intSumCorrect.textContent = stats.correct;
    if (this.intSumWrong) this.intSumWrong.textContent = stats.wrong;
    if (this.intSumExp) this.intSumExp.textContent = `+${stats.exp} XP`;
    if (this.intSumAccuracy) this.intSumAccuracy.textContent = `${accuracy}%`;
    if (this.intSumAccuracyBar) this.intSumAccuracyBar.style.width = `${accuracy}%`;

    if (stats.mistakes.length > 0) {
      if (this.intSumMistakesBox) this.intSumMistakesBox.classList.remove('hidden');
      if (this.intSumMistakesCount) this.intSumMistakesCount.textContent = stats.mistakes.length;
      if (this.intSumMistakesList) {
        this.intSumMistakesList.innerHTML = stats.mistakes.map(c => `
          <div class="p-2.5 rounded-xl bg-white dark:bg-surface-elevated border border-rose-500/20 flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-slate-900 dark:text-white">${c.word}</span>
              <span class="text-slate-400 font-mono text-[11px] ml-1">${c.phonetic || ''}</span>
              <div class="text-rose-500 font-medium text-[11px] mt-0.5">${c.vietnameseMeaning}</div>
            </div>
            <button onclick="window.app.audio.playWordPronunciation('${c.word}', '${c.audioUrl}')" class="p-1 rounded text-slate-400 hover:text-violet-500">
              <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('');
      }
    } else {
      if (this.intSumMistakesBox) this.intSumMistakesBox.classList.add('hidden');
    }

    if (this.modalInteractiveSummary) {
      this.modalInteractiveSummary.classList.remove('hidden');
      this.modalInteractiveSummary.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  }

  closeInteractiveSummary() {
    if (this.modalInteractiveSummary) {
      this.modalInteractiveSummary.classList.add('hidden');
      this.modalInteractiveSummary.classList.remove('flex');
    }
    this.switchTab('study');
  }

  startNextInteractiveSession() {
    if (this.modalInteractiveSummary) {
      this.modalInteractiveSummary.classList.add('hidden');
      this.modalInteractiveSummary.classList.remove('flex');
    }
    this.openInteractiveSetup();
  }

  retryInteractiveMistakes() {
    if (this.modalInteractiveSummary) {
      this.modalInteractiveSummary.classList.add('hidden');
      this.modalInteractiveSummary.classList.remove('flex');
    }
    const mistakes = this.interactiveSessionStats.mistakes;
    if (!mistakes || mistakes.length === 0) {
      Toast.show('Không có từ làm sai trong phiên vừa rồi!', 'info');
      this.openInteractiveSetup();
      return;
    }

    // Start with mistakes pool
    const queue = mistakes.map(card => ({
      id: 'q-retry-' + card.id + '-' + Math.random().toString(36).substr(2, 4),
      card,
      type: 'listen',
      answered: false,
      isCorrect: false,
      userAnswer: ''
    }));

    this.interactiveSessionQueue = queue;
    this.currentInteractiveIndex = 0;
    this.interactiveSessionStats = { total: queue.length, correct: 0, wrong: 0, mistakes: [], exp: 0 };
    if (this.interactiveSetupScreen) this.interactiveSetupScreen.classList.add('hidden');
    if (this.interactiveActiveScreen) this.interactiveActiveScreen.classList.remove('hidden');
    this.renderInteractiveQuestion();
  }

  quitInteractiveSession() {
    if (confirm('Bạn có chắc chắn muốn kết thúc phiên học hiện tại không?')) {
      this.stopCountdownTimer();
      this.finishInteractiveSession();
    }
  }

  startInteractiveForDeck(deckId) {
    this.switchTab('interactive');
    if (this.interactiveDeckSelect) {
      this.interactiveDeckSelect.value = deckId;
    }
    this.updateInteractiveSetupPreview();
  }
}

// Instantiate on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new VocabMasterApp();
});
