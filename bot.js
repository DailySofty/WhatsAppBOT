const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

const fs = require('fs');

const schedule = require('node-schedule');

let data = [];

fs.readFile('./data.json', 'utf8', (err, jsonString) => {
  if (err) {
    console.log('[data] error reading file from disk:', err);
    updateData(data);

    return;
  }
  try {
    data = JSON.parse(jsonString);
    console.log('[data] data loaded from disk:', data);
  } catch (err) {
    console.log('[data] error parsing JSON string:', err);
  }
});

function updateData(newData) {
  fs.writeFile('./data.json', JSON.stringify(newData), err => {
    if (err) {
      console.log('[updateData] error writing file', err);
    } else {
      console.log('[updateData] successfully wrote file');
    }
  });
}

//? @liltheu
// var answer = window.prompt("Você prefere o bot pelo seu dispositivo movel ");

// location.replace("./home.html")

const MSG_ADD = '🤗 Muito obrigado por me adicionar!' +
  '\n\nPara habilitar o serviço, me adicione como ⭐️ *Administrador* do grupo.';

const MSG_LEAVE = '😪 Foi bom enquanto durou, mas eu preciso ser ⭐️ *Administrador* para continuar.';

const MSG_WELCOME = '🤖 *Serviço habilitado!*' +
  '\n\n❓ Aqui estão as instruções de como usar:' +
  '\n\n*-* Gerencie os dados de seu evento (nome, descrição, data, hora, local)' +

  '\n\n💬 ```Comandos```:' +

  '\n\n*/ping* - Verifica se o BOT está online.' +
  '\n_Exemplo_: ```/ping```' +

  '\n\n*/ajuda* - Retorna os comandos disponíveis.' +
  '\n_Exemplo_: ```/ajuda```' +

  '\n\n*/info* - Retorna as informações do BOT.' +
  '\n_Exemplo_: ```/info```' +

  '\n\n*/evento* - Retorna com os dados do evento.' +
  '\n_Exemplo_: ```/evento```' +

  '\n\n*/nome* - Altera o nome do grupo.' +
  '\n_Exemplo_: ```/nome Bora sair galera```' +

  '\n\n*/descricao* - Altera a descrição do grupo.' +
  '\n_Exemplo_: ```/descricao Vamos nos encontrar as 19h```' +

  '\n\n*/data* - Altera a data do evento.' +
  '\n_Exemplo_: ```/data 17/11/2022```' +

  '\n\n*/hora* - Altera a hora do evento.' +
  '\n_Exemplo_: ```/hora 19:10```' +

  '\n\n*/local* - Altera o local do evento.' +
  '\n_Exemplo_: ```/local Av. Fulaninho de Paula, 1337```' +

  '\n\nSegue o link do convite do grupo, compartilhe com os convidados!';

const MSG_HELP = '💬 ```Comandos```:' +
  '\n\n*/ping* - Verifica se o BOT está online.' +
  '\n_Exemplo_: ```/ping```' +

  '\n\n*/ajuda* - Retorna os comandos disponíveis.' +
  '\n_Exemplo_: ```/ajuda```' +

  '\n\n*/info* - Retorna as informações do BOT.' +
  '\n_Exemplo_: ```/info```' +

  '\n\n*/evento* - Retorna com os dados do evento.' +
  '\n_Exemplo_: ```/evento```' +

  '\n\n*/nome* - Altera o nome do grupo.' +
  '\n_Exemplo_: ```/nome Bora sair galera```' +

  '\n\n*/descricao* - Altera a descrição do grupo.' +
  '\n_Exemplo_: ```/descricao Vamos nos encontrar as 19h```' +

  '\n\n*/data* - Altera a data do evento.' +
  '\n_Exemplo_: ```/data 17/11/2022```' +

  '\n\n*/hora* - Altera a hora do evento.' +
  '\n_Exemplo_: ```/hora 19:10```' +

  '\n\n*/local* - Altera o local do evento.' +
  '\n_Exemplo_: ```/local Av. Fulaninho de Paula, 1337```';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: process.argv[2] == '--show' ? false : true },
});

client.on('qr', qr => {
  console.log('[qr] generating...');
  qrcode.generate(qr, { small: true });

  updateData([]);
});

client.on('loading_screen', (percent, message) => {
  console.log(`[loading_screen] ${percent}%`, message);
});

client.on('authenticated', (session) => {
  console.log('[authenticated] client is authenticated!', session);
});

client.on('auth_failure', error => {
  console.error('[auth_failure] ERROR', error);
});

client.on('ready', () => {
  console.log('[ready] client is ready!');
});

client.on('group_join', async (notification) => {
  console.log('[group_join]', notification);

  let wasAdded = false;
  for (const [, value] of Object.entries(data)) {
    if (value.chatId === notification.chatId) {
      wasAdded = true;
      break;
    }
  }

  if (wasAdded == false) {
    const chat = await notification.getChat();

    if (chat.isGroup) {
      const newGroup = {
        name: chat.name,
        chatId: chat.id._serialized,
        owner: chat.owner.user,
        createdAt: chat.createdAt.toString(),
        isAdm: false,
        date: null,
        schedule: null,
        location: null,
        guestArray: [],
        guestArray_compact: [],
        remainingTime: null
      };

      data.push(newGroup);
      updateData(data);

      console.log('[group_join] adding group to data', newGroup);

      notification.reply(MSG_ADD);
    }
  }
});

client.on('group_leave', (notification) => {
  console.log('[group_leave]', notification);
  notification.reply('Alguem saiu.');

  if (notification.id.participant == client.info.wid._serialized) {
    console.log('[group_leave] you were removed');
    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === notification.chatId) {
        console.log('[group_leave] removing group from data', value);

        delete data[key];
        data = data.filter(function (e) { return e; });
        updateData(data);
        break;
      }
    }
  }
});

client.on('group_update', async (notification) => {
  console.log('[group_update]', notification);

  for (const [key, value] of Object.entries(data)) {
    if (value.chatId === notification.chatId) {
      const chat = await notification.getChat();

      if (data[key]['name'] != chat.name) {
        data[key]['name'] = chat.name;
        updateData(data);
      }

      if (data[key]['isAdm'] == false) {
        for (const participant of chat.participants) {
          if (participant.id._serialized == client.info.wid._serialized && participant.isAdmin) {
            data[key]['isAdm'] = true;
            updateData(data);

            console.log('[group_update] updating group data', data[key]);

            const invite = await chat.getInviteCode();
            console.log('[group_update] invite code', invite);
            // notification.reply(`https://chat.whatsapp.com/${invite}`);
            notification.reply(MSG_WELCOME.concat(`\n\nhttps://chat.whatsapp.com/${invite}`));

            return;
          }
        }
      } else {
        for (const participant of chat.participants) {
          if (participant.id._serialized == client.info.wid._serialized && !participant.isAdmin) {
            data[key]['isAdm'] = false;
            updateData(data);

            console.log('[group_update] updating group data', data[key]);

            notification.reply(MSG_LEAVE);

            return;
          }
        }
      }
    }
  }
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

  if (message.body === '/ping') {
    console.log('[message#ping] pong');
    message.reply('pong');

    return;
  }

  if (message.body.startsWith('/nome ')) {
    console.log('[message#nome]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newName = message.body.slice(6);
      console.log('[message#nome] newName', newName);

      chat.setSubject(newName);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['name'] = newName;
          updateData(data);
        }
      }

      message.reply('✅ Nome atualizada com sucesso!');
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/descricao ')) {
    console.log('[message#desc]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newDescription = message.body.slice(6);
      console.log('[message#desc] newDescription', newDescription);

      chat.setDescription(newDescription);

      message.reply('✅ Descrição atualizada com sucesso!');
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/data ')) {
    console.log('[message#data]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newDate = message.body.slice(6);
      console.log('[message#data] newDate', newDate);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['date'] = newDate;
          updateData(data);

          message.reply('✅ Data atualizada com sucesso!');
        }
      }
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/hora ')) {
    console.log('[message#hora]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newSchedule = message.body.slice(6);
      console.log('[message#hora] newSchedule', newSchedule);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['schedule'] = newSchedule;
          updateData(data);

          message.reply('✅ Hora atualizada com sucesso!');
        }
      }
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/local ')) {
    console.log('[message#local]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newLocation = message.body.slice(7);
      console.log('[message#local] newLocation', newLocation);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['location'] = newLocation;
          updateData(data);

          message.reply('✅ Local atualizado com sucesso!');
        }
      }
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/lista ')) {
    console.log('[message#lista]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          console.log('[message#lista] guestArray', data[key]['guestArray']);

          let guestList = '```Lista de convidados```\n';

          for (const guest of data[key]['guestArray']) {
            console.log('[message#lista] guest', guest);

            const contact = await client.getContactById(guest);
            console.log('[message#lista] contact', contact);

            if (guest.presence == true) {
              guestList += `\n✔️ @${contact.id.user}`;
            } else {
              guestList += `\n❌ @${contact.id.user}`;
            }
          }

          message.reply(guestList);
        }
      }
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body === '/evento') {
    console.log('[message#evento]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          const name = data[key]['name'];
          console.log('[message#evento] name', name);

          const date = data[key]['date'];
          console.log('[message#evento] date', date);

          const schedule = data[key]['schedule'];
          console.log('[message#evento] schedule', schedule);

          const location = data[key]['location'];
          console.log('[message#evento] location', location);

          const guestArray_compact = data[key]['guestArray_compact'].length > 0 ? data[key]['guestArray_compact'] : null;
          console.log('[message#evento] guestArray_compact', guestArray_compact);

          const remainingTime = data[key]['remainingTime'];
          console.log('[message#evento] remainingTime', remainingTime);


          message.reply(
            `Detalhes do *${name}*:` +
            `\n\n- \`\`\`Data\`\`\`: *${date}*` +
            `\n\n- \`\`\`Hora\`\`\`: *${schedule}*` +
            `\n\n- \`\`\`Local\`\`\`: *${location}*` +
            `\n\n- \`\`\`Lista de convidados\`\`\`: *${guestArray_compact}*` + //TODO - Arrumar a lista de convidados || ✔️ SIM / ❌ NÃO / ❔ NÃO RESPONDEU
            `\n\n- \`\`\`Faltam\`\`\`: *${remainingTime}*`
          );
        }
      }
    } else {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body === '/ajuda' || message.body === '/help' || message.body === '/comandos' || message.body === '/commands') {
    console.log('[message#ajuda]');

    message.reply(MSG_HELP);

    return;
  }

  if (message.body === '/info') {
    console.log('[message#info]');

    const chat = await message.getChat();

    const chats = await client.getChats();

    if (chat.isGroup) {
      message.reply(
        '```Informações```:' +
        `\n\n- *Nome*: ${client.info.pushname}` +
        `\n\n- *Número*: ${client.info.wid.user}` +
        `\n\n- *Plataforma*: ${client.info.platform}` +
        `\n\n- *Conversas*: ${chats.length}` +
        '\n\n```Informações do Grupo```:' +
        `\n\n- *Nome*: ${chat.name}` +
        `\n\n- *Descrição*: ${chat.description}` +
        `\n\n- *Data de Criação*: ${chat.createdAt.toString()}` +
        `\n\n- *Criado por*: ${chat.owner.user}` +
        `\n\n- *Número de Participantes*: ${chat.participants.length}`
      );
    } else {
      message.reply(
        '```Informações```:' +
        `\n\n- *Nome*: ${client.info.pushname}` +
        `\n\n- *Número*: ${client.info.wid.user}` +
        `\n\n- *Plataforma*: ${client.info.platform}` +
        `\n\n- *Conversas*: ${chats.length}`
      );
    }

    return;
  }
});

console.log('\n[bot] starting...');
client.initialize();

process.on('SIGINT', () => { exit(); });  // CTRL+C
process.on('SIGQUIT', () => { exit(); }); // Keyboard quit
process.on('SIGTERM', () => { exit(); }); // `kill` command

function exit() {
  client.destroy();
  console.log('[bot] finished.');
}

//? Midnight [0 0 * * *]
//? 5 Minutes [*/5 * * * *]
schedule.scheduleJob('*/5 * * * *', () => {
  console.log('[schedule] */5 * * * *');

  const now = new Date();
  console.log('[schedule] now', now);

  // eslint-disable-next-line no-unused-vars
  for (const [key, value] of Object.entries(data)) {
    const date = new Date(value.date);
    console.log('[schedule] date', date);

    const remainingTime = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    console.log('[schedule] remainingTime', remainingTime);

    // data[key]['remainingTime'] = remainingTime;
    // updateData(data);
  }
});
