// 모바일 메뉴 열기/닫기, 문의 양식 전송
(function () {
  var cfg = window.BRONTO_CONFIG || {};
  var contactEmail = cfg.contactEmail || 'contact@bronto.co.kr';

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
    return {
      subject: '[홈페이지 ' + f.type.value + '] ' + f.company.value + ' - ' + products,
      fields: {
        '문의 유형': f.type.value,
        '회사명': f.company.value,
        '담당자': f.name.value,
        '연락처': f.phone.value,
        '이메일': f.email.value,
        '관심 제품': products,
        '문의 내용': f.message.value
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
    showStatus('info', '메일 작성 창을 열었습니다. 메일 프로그램에서 보내기를 눌러 주세요. 창이 열리지 않으면 ' + contactEmail + ' 로 직접 보내 주세요.');
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
    submitBtn.textContent = '보내는 중…';
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
      showStatus('ok', '문의가 접수되었습니다. 담당자가 확인한 뒤 입력하신 연락처로 회신드리겠습니다.');
    }).catch(function () {
      showStatus('err', '전송하지 못했습니다. 잠시 후 다시 시도하시거나 ' + contactEmail + ' 로 메일을 보내 주세요.');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = '문의 보내기';
    });
  });
})();
