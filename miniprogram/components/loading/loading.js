// components/loading/loading.js
Component({
  properties: {
    // 加载类型
    type: {
      type: String,
      value: 'circular' // circular, spinner, dots
    },
    // 加载文字
    text: {
      type: String,
      value: '加载中...'
    },
    // 是否显示
    show: {
      type: Boolean,
      value: true
    },
    // 是否全屏
    fullscreen: {
      type: Boolean,
      value: false
    },
    // 尺寸
    size: {
      type: String,
      value: '30px'
    },
    // 颜色
    color: {
      type: String,
      value: '#1890FF'
    }
  },

  methods: {}
});