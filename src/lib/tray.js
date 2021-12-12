const EventEmitter = require("events");
const path = require("path");
const { shell, nativeTheme, Menu, Tray } = require("electron");

const config = require("./config");
const logger = require("./logger");
const util = require("./util");
const events = require("./events");

const iconOn = path.join(__dirname, `/../../assets/on.png`);
const iconOff = path.join(__dirname, `/../../assets/off.png`);
// const iconOff = nativeImage.createFromDataURL(offUrl);
// todo use nativeImage and png loader

class CustomTray extends EventEmitter {
  tray = null;
  contextMenu = null;
  state = null;

  baseMenuTemplate = [
    { type: "separator" },
    {
      label: "Настройки",
      submenu: [
        {
          label: "Скрывать названия файлов",
          type: "checkbox",
          checked: config.get("hideFilenames"),
          click: (menuItem) =>
            this.saveConfigAndUpdate("hideFilenames", menuItem.checked),
        },
        {
          label: "Скрывать статус: Сидит/Работает",
          type: "checkbox",
          checked: config.get("hideStatus"),
          click: (menuItem) =>
            this.saveConfigAndUpdate("hideStatus", menuItem.checked),
        },
        {
          label: 'Скрывать кнопку присоедениться',
          type: "checkbox",
          checked: config.get("hideViewButton"),
          click: (menuItem) =>
            this.saveConfigAndUpdate("hideViewButton", menuItem.checked),
        },
        {
          label: "Подключаться к Discord когда это приложение запускается ",
          enabled: false,
          type: "checkbox",
          checked: config.get("connectOnStartup"),
          click: (menuItem) =>
            this.saveConfigAndUpdate("connectOnStartup", menuItem.checked),
         },
      //   {
       //   label: "Автоматическая проверка обновлений",
        //  type: "checkbox",
         // checked: config.get("autoCheckForUpdates"),
         // click: (menuItem) =>
          //  this.saveConfigAndUpdate("autoCheckForUpdates", menuItem.checked),
       // },
      ],
    },

    { type: "separator" },
    {
      label: "Проверить на обновления",
      enabled: false,
      click: () => dialog.showMessageBox({
        type: "question",
        title: "Информация об обновлениях",
        message: `На данный момент эта функция не работает.`,
      })
    },
    {
      label: "Показать конфиг",
      click: () => shell.openPath(util.getAppDataPath()),
    },
    { type: "separator" },
    {
      label: "Выйти",
      click: () => this.emit(events.QUIT),
    },
  ];

  constructor(trayState) {
    super();

    logger.debug("tray", "initalized");

    this.state = trayState;

    this.tray = new Tray(this.getIconPath());
    this.update();

    nativeTheme.on("updated", () => this.update());
  }

  getIconPath() {
    const iconState = this.state.isDiscordReady ? "Включить" : "Выключить";

    if (process.platform === "darwin") {
      return path.join(__dirname, `/../../assets/IconOffTemplate.png`);
    } else if (process.platform === "win32") {
      // always use the darkmode icon on windows, taskbar seems to be dark regardless of theme
      return path.join(__dirname, `/../../assets/IconOffWindows.png`);
    }
  }

  update() {
    let menuTemplate;

    if (this.state.isDiscordReady) {
      menuTemplate = [
        {
          label: `Подключено к Discord`,
          enabled: false,
          icon: iconOn,
        },
        { type: "separator" },
        {
          label: "Отключиться к Discord",
          click: () => this.emit(events.DISCONNECT),
        },
      ].concat(this.baseMenuTemplate);
    } else {
      if (this.state.isDiscordConnecting) {
        menuTemplate = [
          {
            label: "Подключаюсь Discord",
            enabled: false,
            icon: iconOff,
          },
          { type: "separator" },
          {
            label: "Остановить подключение к Discord",
            click: () => this.emit(events.DISCONNECT),
          },
        ].concat(this.baseMenuTemplate);
      } else {
        menuTemplate = [
          {
            label: "Не подключено к Discord",
            enabled: false,
            icon: iconOff,
          },
          { type: "separator" },
          {
            label: "Подключиться к Discord",
            click: () => this.emit(events.CONNECT),
          },
        ].concat(this.baseMenuTemplate);
      }
    }

    this.tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
    this.tray.setImage(this.getIconPath());
  }

  saveConfigAndUpdate(configKey, value) {
    config.set(configKey, value);
    config.save();

    // immeditely try a discord activity update
    this.emit(events.UPDATE_OPTIONS, configKey);
  }

  setState(state) {
    this.state = state;
    this.update();
  }
}

module.exports = CustomTray;
