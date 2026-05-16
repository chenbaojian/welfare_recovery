// components/card-item/card-item.js
Component({
  properties: {
    // 卡券数据
    card: {
      type: Object,
      value: {}
    },
    // 显示模式: grid, list
    mode: {
      type: String,
      value: 'grid'
    }
  },

  data: {},

  methods: {
    /**
     * 点击卡券
     */
    onTap() {
      // const { id } = this.data.card;
      // this.triggerEvent('click', { id, card: this.data.card });
      const { id } = this.properties.card;
      this.triggerEvent('click', { id, card: this.properties.card });
    }
  }
});