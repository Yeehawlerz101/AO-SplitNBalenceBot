import http from 'http';

const req = http.request({
    hostname: '127.0.0.1',
    port: 8080,
    path: '/discord/interaction',
    method: 'POST',
    headers: {
        'x-signature-ed25519': 'fake',
        'x-signature-timestamp': '123',
        'content-type': 'application/json'
    }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
    });
});

req.on('error', e => console.error('Error:', e));
req.write('{"type": 1}');
req.end();
