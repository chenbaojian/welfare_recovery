// pages/card/list/list.js
const request = require('../../../utils/request');
const API = require('../../../config/api');
const { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, DEFAULT_ICON_LABEL } = require('../../../config/constants');

Page({
  data: {
    typeId: null,        // 卡券类型ID
    typeName: '',        // 卡券类型名称
    products: [],        // 卡产品列表
    loading: true,
    isEmpty: false,
    // 类型图标信息
    typeIconUrl: null,
    typeIconLabel: '',
    typeIconColor: '',
    typeIconBgColor: ''
  },

  onLoad(options) {
    const { typeId, typeName } = options;

    if (!typeId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const decodedName = typeName ? decodeURIComponent(typeName) : '卡券列表';
    const categoryColor = DEFAULT_CATEGORY_COLOR;

    this.setData({
      typeId,
      typeName: decodedName,
      typeIconUrl: null,
      typeIconLabel: (decodedName && decodedName.length >= 2) ? decodedName.substring(0, 2) : (decodedName || DEFAULT_ICON_LABEL),
      typeIconColor: categoryColor.color,
      typeIconBgColor: categoryColor.bgColor
    });

    // 动态设置导航栏标题
    wx.setNavigationBarTitle({
      title: this.data.typeName
    });

    this.loadProducts();
  },

  /**
   * 加载某类型下的卡产品列表
   */
  async loadProducts() {
    try {
      this.setData({ loading: true });

      const url = `${API.card.typeProducts}/${this.data.typeId}/products`;
      const data = await request.get(url);

      if (data && data.length > 0) {
        const products = data.map(item => ({
          ...item,
          iconUrl: item.iconUrl || null
        }));

        // 从第一个产品获取类型级别的图标信息
        const firstProduct = data[0];
        const typeIconUrl = firstProduct.iconUrl || null;
        const categoryColor = CATEGORY_COLORS[firstProduct.category] || DEFAULT_CATEGORY_COLOR;

        this.setData({
          products,
          typeIconUrl,
          typeIconColor: firstProduct.iconColor || categoryColor.color,
          typeIconBgColor: firstProduct.iconBgColor || categoryColor.bgColor,
          isEmpty: false,
          loading: false
        });
      } else {
        this.setData({
          products: [],
          isEmpty: true,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载卡产品列表失败:', err);
      this.setData({
        products: [],
        isEmpty: true,
        loading: false
      });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择卡产品 → 跳转到订单提交页
   */
  onSelectProduct(e) {
    const { id, name } = e.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/detail/detail?cardProductId=${id}&cardTypeId=${this.data.typeId}&cardProductName=${encodeURIComponent(name || '')}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadProducts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: `${this.data.typeName} - 福利回收`,
      path: `/pages/card/list/list?typeId=${this.data.typeId}&typeName=${encodeURIComponent(this.data.typeName)}`
    };
  }
});
