const qrcode = require('qrcode-terminal');

const moment = require('moment-timezone');
moment.tz.setDefault('America/Sao_Paulo');

const { Client, LocalAuth } = require('whatsapp-web.js');

const fs = require('fs');

const schedule = require('node-schedule');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: process.argv[2] == '--show' ? false : true },
});

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

function checkIfSenderIsAdmin(message, chat) {
  if (chat.isGroup) {
    const authorId = message.author;
    for (const participant of chat.participants) {
      if (participant.id._serialized === authorId && participant.isAdmin) {
        return true;
      }
    }
  }

  return false;
}

function checkDateInput(type, input) {
  switch (type) {
    case 'date': //* DD/MM/YYYY
      try {
        const dateRaw = input.split('/');
        // console.log('[checkDateInput] dateRaw', dateRaw);

        const day = dateRaw[0];
        // console.log('[checkDateInput] day', day);

        const month = dateRaw[1];
        // console.log('[checkDateInput] month', month);

        const year = dateRaw[2];
        // console.log('[checkDateInput] year', year);

        if (day.length != 2 || month.length != 2 || year.length != 4) { return false; }

        console.log('[checkDateInput] return', true);
        return true;
      } catch (error) {
        // console.log('[checkDateInput] error', error);

        console.log('[checkDateInput] return', false);
        return false;
      }

    case 'hour': //* HH:MM
      try {
        const hourRaw = input.split(':');
        // console.log('[checkDateInput] hourRaw', hourRaw);

        const hours = hourRaw[0];
        // console.log('[checkDateInput] hours', hours);

        const minutes = hourRaw[1];
        // console.log('[checkDateInput] minutes', minutes);

        if (hours.length != 2 || minutes.length != 2) { return false; }

        console.log('[checkDateInput] return', true);
        return true;
      } catch (error) {
        // console.log('[checkDateInput] error', error);

        console.log('[checkDateInput] return', false);
        return false;
      }

    default:
      return false;
  }
}

function getRemainingTime(date, schedule) {
  if (checkDateInput('date', date) && checkDateInput('hour', schedule)) {
    const rawDate = date.split('/');
    console.log('[getRemainingTime] rawDate', rawDate);

    const day = rawDate[0];
    // console.log('[getRemainingTime] day', day);

    const month = rawDate[1];
    // console.log('[getRemainingTime] month', month);

    const year = rawDate[2];
    // console.log('[getRemainingTime] year', year);

    const rawHour = schedule.split(':');
    console.log('[getRemainingTime] rawHour', rawHour);

    const hours = rawHour[0];
    // console.log('[getRemainingTime] hours', hours);

    const minutes = rawHour[1];
    // console.log('[getRemainingTime] minutes', minutes);

    const dateEvent = moment.parseZone(`${year}-${month}-${day}T${hours}:${minutes}:00-13:00`);
    const dateNow = moment().utcOffset('-13:00').add(10, 'hours');
    const remainingTime = dateEvent.diff(dateNow, 'minutes');

    console.log('[getRemainingTime] dateEvent', dateEvent);
    console.log('[getRemainingTime] dateNow', dateNow);
    console.log('[getRemainingTime] remainingTime', remainingTime);

    return remainingTime;
  } else {
    console.log('[getRemainingTime] invalid date or hour');

    return null;
  }
}

async function notifyRemainingTime(group_id, msg) {
  console.log('[schedule] group_id', group_id);
  console.log('[schedule] msg', msg);

  const chat = await client.getChatById(group_id);
  chat.sendMessage(msg);
}

//? @liltheu
// var answer = window.prompt("Você prefere o bot pelo seu dispositivo movel ");

// location.replace("./home.html")

const MSG_ADD = '🤗 Muito obrigado por me adicionar!' +
  '\n\n🤖 Para habilitar o serviço, me adicione como ⭐️ *Administrador* do grupo.';

const MSG_LEAVE = '🤖 *Serviço desabilitado!*' +
  '\n\n😪 Foi bom enquanto durou, mas eu preciso ser ⭐️ *Administrador* para continuar.';

const MSG_WELCOME = '🤖 *Serviço habilitado!*' +
  '\n\n❓ Aqui estão as instruções de como usar:' +
  '\n\n*-* Gerencie os dados de seu evento (nome, descrição, data, hora, local)' +

  '\n\n💬 ```Comandos```:' +
  '\n*-* 🔴 *Administradores*' +
  '\n*-* 🔵 *Convidados*' +
  '\n*-* 🟢 *Todos*' +

  '\n\n🟢 */ping* - Verifica se o BOT está online.' +
  '\n_Exemplo_: ```/ping```' +

  '\n\n🟢 */ajuda* - Retorna os comandos disponíveis.' +
  '\n_Exemplo_: ```/ajuda```' +

  '\n\n🟢 */info* - Retorna as informações do BOT.' +
  '\n_Exemplo_: ```/info```' +

  '\n\n🔵 */link* - Retorna com o link do grupo.' +
  '\n_Exemplo_: ```/link```' +

  '\n\n🔵 */evento* - Retorna com os dados do evento.' +
  '\n_Exemplo_: ```/evento```' +

  '\n\n🔵 */lista* - Retorna a lista de convidados detalhada.' +
  '\n_Exemplo_: ```/lista```' +

  '\n\n🔵 */sim* - Confirma a presença no evento.' +
  '\n_Exemplo_: ```/sim```' +

  '\n\n🔵 */nao* - Confirma a ausência  no evento.' +
  '\n_Exemplo_: ```/nao```' +

  '\n\n🔴 */nome* - Altera o nome do grupo.' +
  '\n_Exemplo_: ```/nome Bora sair galera```' +

  '\n\n🔴 */descricao* - Altera a descrição do grupo.' +
  '\n_Exemplo_: ```/descricao Vamos nos encontrar as 19h```' +

  '\n\n🔴 */data* - Altera a data do evento.' +
  '\n_Exemplo_: ```/data 17/11/2022```' +

  '\n\n🔴 */hora* - Altera a hora do evento.' +
  '\n_Exemplo_: ```/hora 19:10```' +

  '\n\n🔴 */local* - Altera o local do evento.' +
  '\n_Exemplo_: ```/local Av. Fulaninho de Paula, 1337```' +

  '\n\nSegue o link do grupo, compartilhe com os convidados!';

const MSG_HELP = '💬 ```Comandos```:' +
  '\n- 🔴 *Administradores*' +
  '\n- 🔵 *Convidados*' +
  '\n- 🟢 *Todos*' +

  '\n\n🟢 */ping* - Verifica se o BOT está online.' +
  '\n_Exemplo_: ```/ping```' +

  '\n\n🟢 */ajuda* - Retorna os comandos disponíveis.' +
  '\n_Exemplo_: ```/ajuda```' +

  '\n\n🟢 */info* - Retorna as informações do BOT.' +
  '\n_Exemplo_: ```/info```' +

  '\n\n🔵 */link* - Retorna com o link do grupo.' +
  '\n_Exemplo_: ```/link```' +

  '\n\n🔵 */evento* - Retorna com os dados do evento.' +
  '\n_Exemplo_: ```/evento```' +

  '\n\n🔵 */lista* - Retorna a lista de convidados detalhada.' +
  '\n_Exemplo_: ```/lista```' +

  '\n\n🔵 */sim* - Confirma a presença no evento.' +
  '\n_Exemplo_: ```/sim```' +

  '\n\n🔵 */nao* - Confirma a ausência  no evento.' +
  '\n_Exemplo_: ```/nao```' +

  '\n\n🔴 */nome* - Altera o nome do grupo.' +
  '\n_Exemplo_: ```/nome Bora sair galera```' +

  '\n\n🔴 */descricao* - Altera a descrição do grupo.' +
  '\n_Exemplo_: ```/descricao Vamos nos encontrar as 19h```' +

  '\n\n🔴 */data* - Altera a data do evento.' +
  '\n_Exemplo_: ```/data 17/11/2022```' +

  '\n\n🔴 */hora* - Altera a hora do evento.' +
  '\n_Exemplo_: ```/hora 19:10```' +

  '\n\n🔴 */local* - Altera o local do evento.' +
  '\n_Exemplo_: ```/local Av. Fulaninho de Paula, 1337```';

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
        remainingTime: null,
        link: null,
        date: null,
        schedule: null,
        location: null,
        guestArray: []
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
            const invite = await chat.getInviteCode();
            console.log('[group_update] invite code', invite);

            data[key]['link'] = invite;
            data[key]['isAdm'] = true;
            updateData(data);

            console.log('[group_update] updating group data', data[key]);

            // notification.reply(`https://chat.whatsapp.com/${invite}`);
            notification.reply(MSG_WELCOME.concat(`\n\n*https://chat.whatsapp.com/${invite}*`));

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

  const message_chat = await message.getChat();

  //? 🟢 [ALL]
  if (message.body == '/ping') {
    console.log('[message#ping] pong');
    message.reply('pong');

    return;
  }

  //? 🔴 [ADM_GROUP]
  // if (message.body == '/imagem') {
  //   console.log('[message#imagem]');

  //   const chat = await message.getChat();

  //   const authorId = message.author;
  //   for (let participant of chat.participants) {
  //     if (participant.id._serialized === authorId && !participant.isAdmin) {
  //       if (!message.hasMedia()) {
  //         chat.setProfilePicture(message.MessageMedia());
  //         message.reply('✅Imagem do grupo atualizada com sucesso !');
  //       }
  //     } else {
  //       message.reply('🚫 Você não é um administrador!');
  //     }
  //   }
  // }

  //? 🔴 [ADM_GROUP]
  if (message.body.startsWith('/nome ')) {
    console.log('[message#nome]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#nome] checkGroup', checkGroup);

    const checkAdm = checkIfSenderIsAdmin(message, message_chat);
    console.log('[message#nome] checkAdm', checkAdm);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    if (checkAdm == false) {
      message.reply('🚫 Esse comando só pode ser usado por um *Admnistrador*!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const newName = message.body.slice(6);
        console.log('[message#nome] newName', newName);

        chat.setSubject(newName);
        data[key]['name'] = newName;
        updateData(data);

        message.reply('✅ Nome atualizado com sucesso!');
        return;
      }
    }
  }

  //? 🔴 [ADM_GROUP]
  if (message.body.startsWith('/descricao ') || message.body.startsWith('/descrição ')) {
    console.log('[message#descricao]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#descricao] checkGroup', checkGroup);

    const checkAdm = checkIfSenderIsAdmin(message, message_chat);
    console.log('[message#descricao] checkAdm', checkAdm);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    if (checkAdm == false) {
      message.reply('🚫 Esse comando só pode ser usado por um *Admnistrador*!');
      return;
    }

    for (const [, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const newDescription = message.body.slice(10);
        console.log('[message#descricao] newDescription', newDescription);

        chat.setDescription(newDescription);

        message.reply('✅ Descrição atualizada com sucesso!');
        return;
      }
    }
  }

  //? 🔴 [ADM_GROUP]
  if (message.body.startsWith('/data ')) {
    console.log('[message#data]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#data] checkGroup', checkGroup);

    const checkAdm = checkIfSenderIsAdmin(message, message_chat);
    console.log('[message#data] checkAdm', checkAdm);

    const checkInput = checkDateInput('date', message.body.slice(6));
    console.log('[message#data] checkInput', checkInput);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    if (checkAdm == false) {
      message.reply('🚫 Esse comando só pode ser usado por um *Admnistrador*!');
      return;
    }

    if (checkInput == false) {
      message.reply('🚫 *Formato inválido!*' +
        '\n_Exemplo_: ```/data 17/11/2022```'
      );
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const newDate = message.body.slice(6);
        console.log('[message#data] newDate', newDate);

        data[key]['date'] = newDate;
        updateData(data);

        message.reply('✅ Data atualizada com sucesso!');
        return;
      }
    }
  }

  //? 🔴 [ADM_GROUP]
  if (message.body.startsWith('/hora ')) {
    console.log('[message#hora]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#hora] checkGroup', checkGroup);

    const checkAdm = checkIfSenderIsAdmin(message, message_chat);
    console.log('[message#hora] checkAdm', checkAdm);

    const checkInput = checkDateInput('hour', message.body.slice(6));
    console.log('[message#data] checkInput', checkInput);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    if (checkAdm == false) {
      message.reply('🚫 Esse comando só pode ser usado por um *Admnistrador*!');
      return;
    }

    if (checkInput == false) {
      message.reply('🚫 *Formato inválido!*' +
        '\n_Exemplo_: ```/hora 19:10```'
      );
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const newSchedule = message.body.slice(6);
        console.log('[message#hora] newSchedule', newSchedule);

        data[key]['schedule'] = newSchedule;
        updateData(data);

        message.reply('✅ Hora atualizada com sucesso!');
        return;
      }
    }
  }

  //? 🔴 [ADM_GROUP]
  if (message.body.startsWith('/local ')) {
    console.log('[message#local]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#local] checkGroup', checkGroup);

    const checkAdm = checkIfSenderIsAdmin(message, message_chat);
    console.log('[message#local] checkAdm', checkAdm);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    if (checkAdm == false) {
      message.reply('🚫 Esse comando só pode ser usado por um *Admnistrador*!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const newLocation = message.body.slice(7);
        console.log('[message#local] newLocation', newLocation);

        data[key]['location'] = newLocation;
        updateData(data);

        message.reply('✅ Local atualizado com sucesso!');
        return;
      }
    }
  }

  //? 🔵 [ALL_GROUP]
  if (message.body == '/lista') {
    console.log('[message#lista]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#lista] checkGroup', checkGroup);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        console.log('[message#lista] guestArray', data[key]['guestArray']);

        console.log('[message#lista] chat.participants', chat.participants);

        let presentCount = 0;
        let absentCount = 0;
        let noReplyCount = chat.participants.length - 1;

        let guestList = '';

        for (const [, guest] of Object.entries(data[key]['guestArray'])) {
          console.log('[message#lista] guest', guest);

          const contact = await client.getContactById(guest.user);
          console.log('[message#lista] contact', contact);

          if (guest.presence == true) { guestList += `\n✔️ ${contact.pushname} (${contact.id.user})`; presentCount++; noReplyCount--; }
        }

        for (const [, guest] of Object.entries(data[key]['guestArray'])) {
          console.log('[message#lista] guest', guest);

          const contact = await client.getContactById(guest.user);
          console.log('[message#lista] contact', contact);

          if (guest.presence == false) { guestList += `\n❌ ${contact.pushname} (${contact.id.user})`; absentCount++; noReplyCount--; }
        }

        //TODO listar quem ainda não respondeu
        // for (const participant of chat.participants) {
        //   for (const [, guest] of Object.entries(data[key]['guestArray'])) {
        //     console.log('[message#lista] guest', guest);

        //     const contact = await client.getContactById(participant.id._serialized);
        //     console.log('[message#lista] contact', contact);

        //     if (guest.user == participant.id._serialized) { continue; }
        //     else { guestList += `\n❔ ${contact.pushname} (${contact.id.user})`; }
        //   }
        // }

        message.reply('📝 ```Lista de convidados```:\n' +
          `\n✔️ *${presentCount}*` +
          `\n❌ *${absentCount}*` +
          `\n❔ *${noReplyCount}*` +
          '\n\n```--------------------------------```' +
          guestList
        );
        return;
      }
    }
  }

  //? 🔵 [ALL_GROUP]
  if (message.body == '/sim') {
    console.log('[message#sim]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#sim] checkGroup', checkGroup);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        console.log('[message#sim] guestArray', data[key]['guestArray']);

        for (const [guest_key, guest] of Object.entries(data[key]['guestArray'])) {
          console.log('[message#sim] guest', guest);

          if (guest.user == message.author) {
            data[key]['guestArray'][guest_key].presence = true;

            updateData(data);
            message.reply('✔️ Presença confirmada!');

            console.log('[message#sim] edit guestArray', data[key]['guestArray']);
            return;
          }
        }

        data[key]['guestArray'].push({
          user: message.author,
          presence: true
        });

        updateData(data);
        message.reply('✔️ Presença confirmada!');

        console.log('[message#sim] push guestArray', data[key]['guestArray']);
        return;
      }
    }
  }

  //? 🔵 [ALL_GROUP]
  if (message.body == '/nao' || message.body == '/não') {
    console.log('[message#nao]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#nao] checkGroup', checkGroup);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        console.log('[message#nao] guestArray', data[key]['guestArray']);

        for (const [guest_key, guest] of Object.entries(data[key]['guestArray'])) {
          console.log('[message#nao] guest', guest);

          if (guest.user == message.author) {
            data[key]['guestArray'][guest_key].presence = false;

            updateData(data);
            message.reply('❌ Ausência confirmada!');

            console.log('[message#nao] edit guestArray', data[key]['guestArray']);
            return;
          }
        }

        data[key]['guestArray'].push({
          user: message.author,
          presence: false
        });

        updateData(data);
        message.reply('❌ Ausência confirmada!');

        console.log('[message#nao] push guestArray', data[key]['guestArray']);
        return;
      }
    }
  }

  //? 🔵 [ALL_GROUP]
  if (message.body == '/evento') {
    console.log('[message#evento]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#evento] checkGroup', checkGroup);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const name = data[key]['name'];
        console.log('[message#evento] name', name);

        const link = data[key]['link'];
        console.log('[message#evento] link', link);

        const date = data[key]['date'];
        console.log('[message#evento] date', date);

        const schedule = data[key]['schedule'];
        console.log('[message#evento] schedule', schedule);

        const location = data[key]['location'];
        console.log('[message#evento] location', location);

        let guestArray_compact;
        if (data[key]['guestArray'].length > 0) {
          console.log('[message#evento] guestArray', data[key]['guestArray']);

          let presentCount = 0;
          let absentCount = 0;
          let noReplyCount = chat.participants.length - 1;

          for (const [guest_key, guest] of Object.entries(data[key]['guestArray'])) {
            console.log('[message#sim] guest', guest);

            if (data[key]['guestArray'][guest_key].presence == true) { presentCount++; noReplyCount--; }
            if (data[key]['guestArray'][guest_key].presence == false) { absentCount++; noReplyCount--; }
          }

          guestArray_compact = `\n✔️ *${presentCount}*` +
            `\n❌ *${absentCount}*` +
            `\n❔ *${noReplyCount}*`;
        } else {
          guestArray_compact = `*${null}*`;
        }

        console.log('[message#evento] guestArray_compact', guestArray_compact);

        data[key]['remainingTime'] = getRemainingTime(date, schedule);

        const remainingTime = data[key]['remainingTime'];
        console.log('[message#evento] remainingTime', remainingTime);

        message.reply(
          `Detalhes do *${name}*:` +
          `\n\n- \`\`\`Link\`\`\`: *https://chat.whatsapp.com/${link}*` +
          `\n\n- \`\`\`Data\`\`\`: *${date}*` +
          `\n\n- \`\`\`Hora\`\`\`: *${schedule}*` +
          `\n\n- \`\`\`Local\`\`\`: *${location}*` +
          `\n\n- \`\`\`Lista de convidados\`\`\`: ${guestArray_compact}` +
          `\n\n- \`\`\`Faltam\`\`\`: *${remainingTime != null ? (remainingTime / 60).toFixed(2).concat('h') : remainingTime}*`
        );
        return;
      }
    }
  }

  //? 🔵 [ALL_GROUP]
  if (message.body == '/link') {
    console.log('[message#link]');

    const chat = await message.getChat();

    const checkGroup = chat.isGroup;
    console.log('[message#link] checkGroup', checkGroup);

    if (checkGroup == false) {
      message.reply('🚫 Esse comando só pode ser usado em um grupo!');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === chat.id._serialized) {
        const name = data[key]['name'];
        console.log('[message#link] name', name);

        const link = data[key]['link'];
        console.log('[message#link] link', link);

        message.reply(`🌐 \`\`\`Evento:\`\`\` *${name}*\n\n*https://chat.whatsapp.com/${link}*`);
        return;
      }
    }
  }

  //? 🟢 [ALL]
  if (message.body == '/ajuda' || message.body == '/help' || message.body == '/comandos' || message.body == '/commands') {
    console.log('[message#ajuda]');

    message.reply(MSG_HELP);

    return;
  }

  //? 🟢 [ALL]
  if (message.body == '/info') {
    console.log('[message#info]');

    const chat = await message.getChat();

    const chats = await client.getChats();

    if (!chat.isGroup) {
      message.reply(
        '```Informações```:' +
        `\n\n- *Nome*: ${client.info.pushname}` +
        `\n\n- *Número*: ${client.info.wid.user}` +
        `\n\n- *Plataforma*: ${client.info.platform}` +
        `\n\n- *Conversas*: ${chats.length}`
      );
      return;
    }

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
schedule.scheduleJob('*/1 * * * *', () => {
  console.log('\n[schedule] every 1 minute');

  for (const [key, value] of Object.entries(data)) {
    console.log('[schedule] value', value);

    const remainingTime = getRemainingTime(data[key]['date'], data[key]['schedule']);
    console.log(`[schedule] (${data[key]['name']}) remainingTime`, remainingTime);

    if (remainingTime == 61) { notifyRemainingTime(data[key]['chatId'], `⏲️ Falta *1 hora* para o *${data[key]['name']}*!`); }
    if (remainingTime == 1441) { notifyRemainingTime(data[key]['chatId'], `⏲️ Falta *1 dia* para o *${data[key]['name']}*!`); }
    if (remainingTime == 10081) { notifyRemainingTime(data[key]['chatId'], `⏲️ Falta *1 semana* para o *${data[key]['name']}*!`); }
  }
});
