const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('loading_screen', (percent, message) => {
  console.log('[loading_screen] ', percent, message);
});

client.on('qr', qr => {
  console.log('[qr] generating...');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('[authenticated] client is authenticated!');
});

client.on('auth_failure', error => {
  console.error('[auth_failure] ERROR', error);
});

client.on('ready', () => {
  console.log('[ready] client is ready!');
});

client.on('message', async message => {
  console.log('[message] received', message);
  console.log('[message] body = ', message.body);

  if (message.body === '!ping') {
    console.log('[message#ping] pong');
    message.reply('pong');
    // client.sendMessage(message.from, 'pong');

    return;
  }

  if (message.body.includes('!criargrupo')) {
    console.log('[message#criargrupo] creating group...');
    console.log('[message#criargrupo] split', message.body.split(' '));

    const name = message.body.split(' ')[2];
    console.log('[message#criargrupo] name', name);

    const participants = [await client.getNumberId(message.body.split(' ')[1]), await client.getNumberId('0077422222222')];
    console.log('[message#criargrupo] participants', participants);

    await client.createGroup(name, participants);

    console.log('[message#criargrupo] group created');

    return;
  }
});

client.initialize();
