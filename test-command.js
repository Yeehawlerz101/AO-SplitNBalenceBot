import http from 'http';

const payload = JSON.stringify({
    type: 2, // APPLICATION_COMMAND
    data: {
        name: 'bal',
        options: [
            { name: 'user', value: '987654321' },
            { name: 'amount', value: 100 }
        ]
    },
    member: {
        user: {
            id: '123456789'
        }
    }
});

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
    res.on('end', () => console.log('Status:', res.statusCode, '\nResponse:', data));
});

req.on('error', console.error);
req.write(payload);
req.end();
