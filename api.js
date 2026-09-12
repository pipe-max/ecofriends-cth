(function(){
  'use strict';
  const base = 'https://qnikgvtjjzxsjcbquazd.supabase.co/rest/v1/';
  const key = 'sb_publishable_yvPIKT1llfRA5XmOy9CYQQ_E_ZeH0Sk';
  async function request(path, body){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {apikey:key, 'Content-Type':'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body),
        cache:'no-store', signal:controller.signal
      });
      const data = await response.json();
      if(!response.ok){
        const error = new Error(data.message || 'No se pudo completar la solicitud.');
        error.code = data.code; error.status = response.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  window.EcoAPI = {
    rpc:(name, args) => request('rpc/' + name, args),
    candidates:() => request('ecofriends_candidatos?select=id,nombre,foto_url,grupo,seccion,orden&order=orden'),
    groups:() => request('rpc/ecofriends_public_groups', {}),
    esc:value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  };
})();
