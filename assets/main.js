// 모바일 메뉴 열기/닫기, 언어 메뉴, 문의 양식 전송
(function () {
  var cfg = window.BRONTO_CONFIG || {};
  var contactEmail = cfg.contactEmail || 'contact@bronto.co.kr';
  var lang = (document.documentElement.lang || 'ko').slice(0, 2);

  // 화면에 보이는 안내 문구(문의 메일 내용은 담당자가 읽으므로 한국어 그대로)
  var MSG = {
    ko: { none: '미정', sending: '보내는 중…', send: '문의 보내기',
          ok: '문의가 접수되었습니다. 담당자가 확인한 뒤 입력하신 연락처로 회신드리겠습니다.',
          err: '전송하지 못했습니다. 잠시 후 다시 시도하시거나 {m} 로 메일을 보내 주세요.',
          mail: '메일 작성 창을 열었습니다. 메일 프로그램에서 보내기를 눌러 주세요. 창이 열리지 않으면 {m} 로 직접 보내 주세요.' },
    en: { none: 'Undecided', sending: 'Sending…', send: 'Send inquiry',
          ok: 'Thank you. Your inquiry has been received, and we will reply to the contact details you provided.',
          err: 'Your inquiry could not be sent. Please try again later or email us at {m}.',
          mail: 'Your mail app has been opened. Please press Send there. If nothing opened, email us directly at {m}.' },
    ja: { none: '未定', sending: '送信中…', send: 'お問い合わせを送信',
          ok: 'お問い合わせを受け付けました。担当者が確認のうえ、ご入力の連絡先にご返信いたします。',
          err: '送信できませんでした。しばらくしてから再度お試しいただくか、{m} までメールでお送りください。',
          mail: 'メール作成画面を開きました。メールソフトで送信を押してください。開かない場合は {m} へ直接お送りください。' },
    zh: { none: '未定', sending: '正在发送…', send: '提交咨询',
          ok: '已收到您的咨询。我们确认后将通过您填写的联系方式回复。',
          err: '发送失败。请稍后重试，或发送邮件至 {m}。',
          mail: '已打开邮件撰写窗口，请在邮件程序中点击发送。如未打开，请直接发送邮件至 {m}。' }
  };
  var T = MSG[lang] || MSG.ko;
  function t(k) { return T[k].replace('{m}', contactEmail); }

  // 언어 메뉴: 고른 언어를 기억하고(첫 방문 자동 이동이 다시 일어나지 않게), 바깥을 누르면 닫는다
  var langMenu = document.querySelector('.lang-menu');
  if (langMenu) {
    langMenu.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-lang]');
      if (a) { try { localStorage.setItem('bronto-lang', a.getAttribute('data-lang')); } catch (err) {} }
    });
    document.addEventListener('click', function (e) {
      if (langMenu.open && !langMenu.contains(e.target)) langMenu.open = false;
    });
  }

  var btn = document.querySelector('.menu-btn');
  var nav = document.querySelector('.nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  var form = document.getElementById('contact-form');
  if (!form) return;

  // ?product=tems,tOps / ?type=데모 요청 으로 들어오면 미리 채운다
  var params = new URLSearchParams(location.search);
  var pre = params.get('product');
  if (pre) {
    pre.split(',').forEach(function (p) {
      var el = form.querySelector('input[name="product"][value="' + p + '"]');
      if (el) el.checked = true;
    });
  }
  var type = params.get('type');
  if (type && form.type) form.type.value = type;

  var status = document.getElementById('form-status');
  var submitBtn = form.querySelector('button[type="submit"]');

  function showStatus(kind, text) {
    status.className = 'form-status ' + kind;
    status.textContent = text;
    status.hidden = false;
  }

  function collect() {
    var f = form.elements;
    var products = Array.prototype.filter.call(form.querySelectorAll('input[name="product"]'), function (el) { return el.checked; })
      .map(function (el) { return el.value; }).join(', ') || '미정';
    var langName = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어' }[lang] || lang;
    return {
      subject: '[홈페이지' + (lang === 'ko' ? ' ' : ' ' + langName + ' ') + f.type.value + '] ' + f.company.value + ' - ' + products,
      fields: {
        '문의 유형': f.type.value,
        '페이지 언어': langName,
        '회사명': f.company.value,
        '담당자': f.name.value,
        '연락처': f.phone.value,
        '이메일': f.email.value,
        '관심 제품': products,
        '문의 내용': f.message.value,
        '개인정보 동의': f.consent && f.consent.checked ? '동의 (처리방침 2026-11-01 판)' : '-'
      },
      email: f.email.value,
      name: f.name.value
    };
  }

  // 전송 서비스 키가 없을 때: 메일 작성 창을 연다
  function openMail(d) {
    var body = Object.keys(d.fields).map(function (k) {
      return k === '문의 내용' ? '\n' + d.fields[k] : k + ': ' + d.fields[k];
    }).join('\n');
    location.href = 'mailto:' + contactEmail + '?subject=' + encodeURIComponent(d.subject) + '&body=' + encodeURIComponent(body);
    showStatus('info', t('mail'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var d = collect();
    if (!cfg.web3formsKey) { openMail(d); return; }

    var payload = {
      access_key: cfg.web3formsKey,
      subject: d.subject,
      from_name: 'bronto.co.kr 문의',
      replyto: d.email,
      name: d.name,
      email: d.email,
      botcheck: form.elements.botcheck.checked
    };
    Object.keys(d.fields).forEach(function (k) { payload[k] = d.fields[k]; });

    submitBtn.disabled = true;
    submitBtn.textContent = t('sending');
    status.hidden = true;
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.success !== false, j: j }; });
    }).then(function (res) {
      if (!res.ok) throw new Error((res.j && res.j.message) || '전송 실패');
      form.reset();
      showStatus('ok', t('ok'));
    }).catch(function () {
      showStatus('err', t('err'));
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = t('send');
    });
  });
})();
