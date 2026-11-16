// A identidade e a autorização iniciais são resolvidas pelo servidor.
window.addEventListener('reservae:session-expired', () => {
    window.location.replace('/login');
}, { once: true });
