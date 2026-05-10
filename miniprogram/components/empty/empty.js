// components/empty/empty.js
Component({
  properties: {
    // 空状态类型
    type: {
      type: String,
      value: 'default'
    },
    // 自定义描述文字
    description: {
      type: String,
      value: ''
    },
    // 自定义图片URL
    image: {
      type: String,
      value: ''
    },
    // 是否显示按钮
    showButton: {
      type: Boolean,
      value: false
    },
    // 按钮文字
    buttonText: {
      type: String,
      value: '重新加载'
    }
  },

  data: {
    // 默认配置 - 使用emoji代替图片
    defaultConfig: {
      default: {
        image: '',
        emoji: '📭',
        description: '暂无数据'
      },
      order: {
        image: '',
        emoji: '📋',
        description: '暂无订单记录'
      },
      search: {
        image: '',
        emoji: '🔍',
        description: '未找到相关内容'
      },
      network: {
        image: '',
        emoji: '📡',
        description: '网络异常，请检查网络'
      },
      error: {
        image: '',
        emoji: '❌',
        description: '加载失败'
      }
    }
  },

  methods: {
    /**
     * 点击按钮
     */
    onButtonClick() {
      this.triggerEvent('buttonclick');
    },

    /**
     * 点击空状态区域
     */
    onTap() {
      this.triggerEvent('click');
    }
  }
});