const THEME_STYLES = {
  dark: {
    default: {
      fill: '#334155', // Màu nền của shape
      stroke: '#cbd5e1', // Màu viền của shape (Làm sáng hơn)
    },
    text: {
      fill: '#f8fafc', // Màu chữ
    },
    gateway: {
      fill: '#475569',
      stroke: '#cbd5e1',
    },
    event: {
      fill: '#475569',
      stroke: '#cbd5e1',
    },
    connection: {
      stroke: '#cbd5e1', // Màu đường kẻ (Làm sáng hơn)
    },
    'marker:conditional': {
      fill: '#334155', // Màu nền cho marker hình thoi
      stroke: '#cbd5e1', // Màu viền cho marker
    },
  },
  light: {
    default: {
      fill: '#ffffff',
      stroke: '#000000',
    },
    text: {
      fill: '#000000',
    },
    gateway: {
      fill: '#ffffff',
      stroke: '#000000',
    },
    event: {
      fill: '#ffffff',
      stroke: '#000000',
    },
    connection: {
      stroke: '#000000',
    },
    'marker:conditional': {
      fill: '#ffffff',
      stroke: '#000000',
    },
  },
};

export default class CustomBpmnTheme {
  constructor(eventBus, bpmnRenderer, textRenderer) {
    this._bpmnRenderer = bpmnRenderer;
    this._textRenderer = textRenderer;
    this._theme = 'light'; // Mặc định là theme sáng

    eventBus.on('theme.changed', (context) => {
      this.setTheme(context.theme);
    });
  }

  setTheme(theme) {
    this._theme = theme;
    const styles = THEME_STYLES[theme] || THEME_STYLES.light;

    this._bpmnRenderer.handlers = { ...this._bpmnRenderer.handlers, ...styles };
    this._textRenderer.DEFAULT_LABEL_SIZE = styles.text.fontSize || 12;
    this._textRenderer.EXTERNAL_LABEL_SIZE = styles.text.fontSize || 11;
  }
}

CustomBpmnTheme.$inject = ['eventBus', 'bpmnRenderer', 'textRenderer'];