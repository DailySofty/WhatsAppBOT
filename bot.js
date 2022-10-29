// const fs = require('fs');

const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('\n[bot] starting...');

// const SESSION_FILE_PATH = '/session.json';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

client.on('qr', qr => {
  console.log('[qr] generating...');
  qrcode.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
  console.log(`[loading_screen] ${percent}%`, message);
});

client.on('authenticated', (session) => {
  // sessionData = session;
  // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
  //   if (err) {
  //     console.error(err);
  //   }
  // });

  console.log('[authenticated] client is authenticated!');
});

client.on('auth_failure', error => {
  console.error('[auth_failure] ERROR', error);
});

client.on('ready', () => {
  console.log('[ready] client is ready!');
});

client.on('group_join', (notification) => {
  console.log('[group_join]', notification);
  notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
  console.log('[group_leave]', notification);
  notification.reply('User left.');
});

client.on('group_update', (notification) => {
  console.log('[group_update]', notification);
});

client.on('change_state', state => {
  console.log('[change_state]', state);
});

client.on('disconnected', (reason) => {
  console.log('[disconnected] client disconnected', reason);
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

  if (message.body.startsWith('!criargrupo ')) {
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

  if (message.body.startsWith('!sendto ')) {
    console.log('[message#sendto]');

    let number = message.body.split(' ')[1];
    let messageIndex = message.body.indexOf(number) + number.length;
    let message = message.body.slice(messageIndex, message.body.length);

    number = number.includes('@c.us') ? number : `${number}@c.us`;

    let chat = await message.getChat();
    chat.sendSeen();

    client.sendMessage(number, message);

    return;

  }

  if (message.body.startsWith('!subject ')) {
    console.log('[message#subject]');

    let chat = await message.getChat();

    if (chat.isGroup) {
      let newSubject = message.body.slice(9);
      chat.setSubject(newSubject);
    } else {
      message.reply('This command can only be used in a group!');
    }

    return;
  }

  if (message.body.startsWith('!echo ')) {
    console.log('[message#echo]');

    message.reply(message.body.slice(6));

    return;
  }

  if (message.body.startsWith('!desc ')) {
    console.log('[message#desc]');

    let chat = await message.getChat();

    if (chat.isGroup) {
      let newDescription = message.body.slice(6);
      chat.setDescription(newDescription);
    } else {
      message.reply('This command can only be used in a group!');
    }

    return;
  }

  if (message.body === '!leave') {
    console.log('[message#leave]');

    let chat = await message.getChat();

    if (chat.isGroup) {
      chat.leave();
    } else {
      message.reply('This command can only be used in a group!');
    }

    return;
  }

  if (message.body.startsWith('!join ')) {
    console.log('[message#join]');

    const inviteCode = message.body.split(' ')[1];

    try {
      await client.acceptInvite(inviteCode);
      message.reply('Joined the group!');
    } catch (e) {
      message.reply('That invite code seems to be invalid.');
    }

    return;
  }

  if (message.body === '!groupinfo') {
    console.log('[message#groupinfo]');

    let chat = await message.getChat();

    if (chat.isGroup) {
      message.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
    } else {
      message.reply('This command can only be used in a group!');
    }

    return;
  }

  if (message.body === '!chats') {
    console.log('[message#chats]');

    const chats = await client.getChats();

    client.sendMessage(message.from, `The bot has ${chats.length} chats open.`);

    return;
  }

  if (message.body === '!info') {
    console.log('[message#info]');

    let info = client.info;
    client.sendMessage(message.from, `
            *Connection info*
            User name: ${info.pushname}
            My number: ${info.wid.user}
            Platform: ${info.platform}
        `);

    return;
  }

  if (message.body === '!mediainfo' && message.hasMedia) {
    console.log('[message#mediainfo]');

    const attachmentData = await message.downloadMedia();

    message.reply(`
            *Media info*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);

    return;
  }

  if (message.body === '!quoteinfo' && message.hasQuotedMsg) {
    console.log('[message#quoteinfo]');

    const quotedMsg = await message.getQuotedMessage();

    quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);

    return;
  }

  if (message.body === '!resendmedia' && message.hasQuotedMsg) {
    console.log('[message#resendmedia]');

    const quotedMsg = await message.getQuotedMessage();

    if (quotedMsg.hasMedia) {
      const attachmentData = await quotedMsg.downloadMedia();

      client.sendMessage(message.from, attachmentData, { caption: 'Here\'s your requested media.' });
    }

    return;
  }

  if (message.body === '!location') {
    console.log('[message#location]');

    message.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));

    return;
  }

  if (message.location) {
    console.log('[message.location]');

    message.reply(message.location);

    return;
  }

  if (message.body.startsWith('!status ')) {
    console.log('[message#status]');

    const newStatus = message.body.split(' ')[1];

    await client.setStatus(newStatus);
    message.reply(`Status was updated to *${newStatus}*`);

    return;
  }

  if (message.body === '!mention') {
    console.log('[message#mention]');

    const contact = await message.getContact();
    const chat = await message.getChat();

    chat.sendMessage(`Hi @${contact.number}!`, {
      mentions: [contact]
    });

    return;
  }

  if (message.body === '!delete') {
    console.log('[message#delete]');

    if (message.hasQuotedMsg) {
      const quotedMsg = await message.getQuotedMessage();

      if (quotedMsg.fromMe) {
        quotedMsg.delete(true);
      } else {
        message.reply('I can only delete my own messages');
      }
    }

    return;
  }

  if (message.body === '!pin') {
    console.log('[message#pin]');

    const chat = await message.getChat();

    await chat.pin();

    return;
  }

  if (message.body === '!archive') {
    console.log('[message#archive]');

    const chat = await message.getChat();

    await chat.archive();

    return;
  }

  if (message.body === '!mute') {
    console.log('[message#mute]');

    const chat = await message.getChat();

    const unmuteDate = new Date();
    unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);

    await chat.mute(unmuteDate);

    return;
  }

  if (message.body === '!typing') {
    console.log('[message#typing]');

    const chat = await message.getChat();

    chat.sendStateTyping();

    return;
  }

  if (message.body === '!recording') {
    console.log('[message#recording]');

    const chat = await message.getChat();

    chat.sendStateRecording();

    return;
  }

  if (message.body === '!clearstate') {
    console.log('[message#clearstate]');

    const chat = await message.getChat();

    chat.clearState();

    return;
  }

  if (message.body === '!jumpto') {
    console.log('[message#jumpto]');

    if (message.hasQuotedMsg) {
      const quotedMsg = await message.getQuotedMessage();

      client.interface.openChatWindowAt(quotedMsg.id._serialized);
    }

    return;
  }

  if (message.body === '!buttons') {
    console.log('[message#buttons]');

    let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');

    client.sendMessage(message.from, button);

    return;
  }

  if (message.body === '!list') {
    console.log('[message#list]');

    let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
    let list = new List('List body', 'btnText', sections, 'Title', 'footer');

    client.sendMessage(message.from, list);

    return;
  }

  if (message.body === '!reaction') {
    console.log('[message#reaction]');

    message.react('👍');

    return;
  }
});

client.initialize();
