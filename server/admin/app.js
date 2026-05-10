// 管理后台前端逻辑

// API基础地址
const API_BASE = '/api/admin';

// 全局状态
let adminToken = localStorage.getItem('adminToken') || '';
let adminRole = localStorage.getItem('adminRole') || '';
let currentOrderPage = 1;
let currentOrderPageSize = 10;
let currentOrderTotal = 0;
let currentUserPage = 1;
let currentUserPageSize = 10;
let currentUserTotal = 0;
let currentRejectOrderId = null;
let currentAssetDetailPage = 1;
let currentAssetDetailPageSize = 20;
let currentAssetDetailTotal = 0;
let currentAssetDetailCardType = '';
let assetSummaryData = null;
let currentSoldAssetDetailPage = 1;
let currentSoldAssetDetailPageSize = 20;
let currentSoldAssetDetailTotal = 0;
let currentSoldAssetDetailCardType = '';
let soldAssetSummaryData = null;
let currentAvailableAssetDetailPage = 1;
let currentAvailableAssetDetailPageSize = 20;
let currentAvailableAssetDetailTotal = 0;
let currentAvailableAssetDetailCardType = '';
let availableAssetSummaryData = null;
let currentBuyOrderPage = 1;
let currentBuyOrderPageSize = 10;
let currentBuyOrderTotal = 0;
let currentOrderTab = 'seller'; // seller | buyer

// ========== 工具函数 ==========

/**
 * 发送API请求
 */
async function apiRequest(url, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': adminToken ? `Bearer ${adminToken}` : ''
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log('发送请求:', API_BASE + url, options);
    const response = await fetch(API_BASE + url, options);
    console.log('响应状态:', response.status);

    const result = await response.json();
    console.log('响应数据:', result);

    if (result.code === 401) {
      showToast('登录已过期，请重新登录', 'error');
      doLogout();
      return null;
    }

    if (result.code !== 200) {
      showToast(result.message || '请求失败', 'error');
      return null;
    }

    return result.data;
  } catch (err) {
    console.error('请求错误:', err);
    showToast('网络请求失败: ' + err.message, 'error');
    return null;
  }
}

/**
 * 显示Toast提示
 */
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast active ' + type;

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

/**
 * 格式化时间
 */
function formatTime(timeStr) {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 格式化金额
 */
function formatMoney(amount) {
  if (!amount) return '¥0.00';
  return '¥' + parseFloat(amount).toFixed(2);
}

/**
 * 获取状态标签HTML
 */
function getStatusTag(status) {
  const statusMap = {
    'PENDING': { text: '待处理', class: 'pending' },
    'PROCESSING': { text: '处理中', class: 'processing' },
    'SUCCESS': { text: '已完成', class: 'success' },
    'FAILED': { text: '已失败', class: 'failed' },
    'CANCELLED': { text: '已取消', class: 'cancelled' }
  };
  const info = statusMap[status] || { text: status, class: '' };
  return `<span class="status-tag ${info.class}">${info.text}</span>`;
}

/**
 * 打开弹窗
 */
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

/**
 * 关闭弹窗
 */
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ========== 登录 ==========

/**
 * 管理员登录
 */
async function doLogin() {
  console.log('开始登录...');
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showToast('请输入用户名和密码', 'warning');
    return;
  }

  console.log('发送登录请求:', { username, password });

  try {
    const result = await apiRequest('/login', 'POST', { username, password });
    console.log('登录响应:', result);

    if (result) {
      adminToken = result.token;
      adminRole = result.adminInfo.role;
      localStorage.setItem('adminToken', adminToken);
      localStorage.setItem('adminRole', adminRole);

      // 更新管理员名称
      document.getElementById('adminName').textContent = result.adminInfo.realName || result.adminInfo.username;

      // 切换到主页面
      document.getElementById('loginPage').classList.remove('active');
      document.getElementById('mainPage').classList.add('active');

      showToast('登录成功', 'success');

      // 加载首页数据
      loadDashboard();
    } else {
      console.error('登录失败: result is null');
    }
  } catch (err) {
    console.error('登录异常:', err);
    showToast('登录失败: ' + err.message, 'error');
  }
}

/**
 * 退出登录
 */
function doLogout() {
  adminToken = '';
  localStorage.removeItem('adminToken');

  document.getElementById('mainPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
}

// ========== 页面切换 ==========

/**
 * 切换页面
 */
function switchPage(pageName) {
  // 更新菜单选中状态
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  // 更新内容页显示
  document.querySelectorAll('.content-page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageName + 'Page').classList.add('active');

  // 加载对应数据
  if (pageName === 'dashboard') loadDashboard();
  if (pageName === 'orders') {
    if (currentOrderTab === 'seller') loadOrders();
    else loadBuyOrders();
  }
  if (pageName === 'users') loadUsers();
  if (pageName === 'assets') loadAssets();
  if (pageName === 'soldAssets') loadSoldAssets();
  if (pageName === 'availableAssets') loadAvailableAssets();
}

// ========== 数据概览 ==========

/**
 * 加载首页统计数据
 */
async function loadDashboard() {
  const data = await apiRequest('/dashboard');

  if (data) {
    document.getElementById('statTodayOrders').textContent = data.todayOrders;
    document.getElementById('statPendingOrders').textContent = data.pendingOrders;
    document.getElementById('statProcessingOrders').textContent = data.processingOrders;
    document.getElementById('statTodayRecycle').textContent = formatMoney(data.todayRecycle);
    document.getElementById('statTotalUsers').textContent = data.totalUsers;
    document.getElementById('statTotalRecycle').textContent = formatMoney(data.totalRecycle);
  }
}

// ========== 订单管理 ==========

/**
 * 加载订单列表
 */
async function loadOrders() {
  const status = document.getElementById('filterStatus').value;
  const orderNo = document.getElementById('filterOrderNo').value;

  const params = new URLSearchParams({
    page: currentOrderPage,
    pageSize: currentOrderPageSize
  });

  if (status) params.append('status', status);
  if (orderNo) params.append('orderNo', orderNo);

  const data = await apiRequest('/order/list?' + params.toString());

  if (data) {
    currentOrderTotal = data.total;
    renderOrderTable(data.list);
    renderOrderPagination();
  }
}

/**
 * 渲染订单表格
 */
function renderOrderTable(list) {
  const tbody = document.getElementById('orderTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">暂无订单数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(order => `
    <tr>
      <td>${order.orderNo}</td>
      <td>${order.userNickname || order.userRealName || '-'}</td>
      <td>${order.cardTypeName}</td>
      <td>${formatMoney(order.faceValue)}</td>
      <td>${formatMoney(order.recycleAmount)}</td>
      <td>${getStatusTag(order.status)}</td>
      <td>${formatTime(order.createTime)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-info btn-sm" onclick="viewOrderDetail(${order.id})">详情</button>
          ${order.status === 'PENDING' || order.status === 'PROCESSING' ? `
            <button class="btn-success btn-sm" onclick="completeOrder(${order.id})">完结</button>
            <button class="btn-danger btn-sm" onclick="showRejectModal(${order.id})">拒绝</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 渲染订单分页
 */
function renderOrderPagination() {
  const totalPages = Math.ceil(currentOrderTotal / currentOrderPageSize);
  const container = document.getElementById('orderPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // 上一页
  html += `<button ${currentOrderPage <= 1 ? 'disabled' : ''} onclick="goOrderPage(${currentOrderPage - 1})">上一页</button>`;

  // 页码
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentOrderPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= 5 || i >= totalPages - 2 || Math.abs(i - currentOrderPage) <= 2) {
      html += `<button onclick="goOrderPage(${i})">${i}</button>`;
    } else if (i === 6 || i === totalPages - 3) {
      html += `<button disabled>...</button>`;
    }
  }

  // 下一页
  html += `<button ${currentOrderPage >= totalPages ? 'disabled' : ''} onclick="goOrderPage(${currentOrderPage + 1})">下一页</button>`;

  // 总数
  html += `<span style="color:#999;font-size:13px;margin-left:10px;">共 ${currentOrderTotal} 条</span>`;

  container.innerHTML = html;
}

/**
 * 订单分页跳转
 */
function goOrderPage(page) {
  currentOrderPage = page;
  loadOrders();
}

// ========== 买家订单 ==========

/**
 * 切换订单Tab
 */
function switchOrderTab(tab) {
  currentOrderTab = tab;

  // 更新Tab样式
  document.querySelectorAll('.order-tab').forEach(t => {
    if (t.dataset.tab === tab) {
      t.style.borderBottom = '2px solid #1890ff';
      t.style.color = '#1890ff';
      t.classList.add('active');
    } else {
      t.style.borderBottom = '2px solid transparent';
      t.style.color = '#666';
      t.classList.remove('active');
    }
  });

  // 切换区域显示
  document.getElementById('sellerOrderSection').style.display = tab === 'seller' ? '' : 'none';
  document.getElementById('buyerOrderSection').style.display = tab === 'buyer' ? '' : 'none';

  // 加载数据
  if (tab === 'seller') loadOrders();
  else loadBuyOrders();
}

/**
 * 加载买家订单列表
 */
async function loadBuyOrders() {
  const status = document.getElementById('filterBuyOrderStatus').value;
  const orderNo = document.getElementById('filterBuyOrderNo').value;

  const params = new URLSearchParams({
    page: currentBuyOrderPage,
    pageSize: currentBuyOrderPageSize
  });

  if (status) params.append('status', status);
  if (orderNo) params.append('orderNo', orderNo);

  const data = await apiRequest('/buy-order/list?' + params.toString());

  if (data) {
    currentBuyOrderTotal = data.total;
    renderBuyOrderTable(data.list);
    renderBuyOrderPagination();
  }
}

/**
 * 渲染买家订单表格
 */
function renderBuyOrderTable(list) {
  const tbody = document.getElementById('buyOrderTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-row">暂无买家订单数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(order => `
    <tr>
      <td>${order.orderNo}</td>
      <td>${order.buyerNickname || order.buyerRealName || '-'}</td>
      <td>${order.sellerNickname || order.sellerRealName || '-'}</td>
      <td>${order.cardTypeName}</td>
      <td>${formatMoney(order.faceValue)}</td>
      <td>${formatMoney(order.buyPrice)}</td>
      <td>${order.discountRate ? (order.discountRate * 10).toFixed(1) + '折' : '-'}</td>
      <td>${getBuyOrderStatusTag(order.status)}</td>
      <td>${formatTime(order.createTime)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-info btn-sm" onclick="viewBuyOrderDetail(${order.id})">详情</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 买家订单状态标签
 */
function getBuyOrderStatusTag(status) {
  const map = {
    'PENDING': '<span class="status-tag status-pending">待支付</span>',
    'PAID': '<span class="status-tag status-success">已支付</span>',
    'CANCELLED': '<span class="status-tag status-cancelled">已取消</span>'
  };
  return map[status] || `<span class="status-tag">${status}</span>`;
}

/**
 * 渲染买家订单分页
 */
function renderBuyOrderPagination() {
  const totalPages = Math.ceil(currentBuyOrderTotal / currentBuyOrderPageSize);
  const container = document.getElementById('buyOrderPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button ${currentBuyOrderPage <= 1 ? 'disabled' : ''} onclick="goBuyOrderPage(${currentBuyOrderPage - 1})">上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentBuyOrderPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= 5 || i >= totalPages - 2 || Math.abs(i - currentBuyOrderPage) <= 2) {
      html += `<button onclick="goBuyOrderPage(${i})">${i}</button>`;
    } else if (i === 6 || i === totalPages - 3) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${currentBuyOrderPage >= totalPages ? 'disabled' : ''} onclick="goBuyOrderPage(${currentBuyOrderPage + 1})">下一页</button>`;
  html += `<span style="color:#999;font-size:13px;margin-left:10px;">共 ${currentBuyOrderTotal} 条</span>`;

  container.innerHTML = html;
}

/**
 * 买家订单分页跳转
 */
function goBuyOrderPage(page) {
  currentBuyOrderPage = page;
  loadBuyOrders();
}

/**
 * 查看买家订单详情
 */
async function viewBuyOrderDetail(buyOrderId) {
  const data = await apiRequest('/buy-order/detail?id=' + buyOrderId);

  if (data) {
    const body = document.getElementById('orderDetailBody');
    const footer = document.getElementById('orderDetailFooter');

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">订单号</span>
          <span class="detail-value">${data.orderNo}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">状态</span>
          <span class="detail-value">${getBuyOrderStatusTag(data.status)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">卡券类型</span>
          <span class="detail-value">${data.cardTypeName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">面值金额</span>
          <span class="detail-value">${formatMoney(data.faceValue)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">购买价格</span>
          <span class="detail-value highlight">${formatMoney(data.buyPrice)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">折扣率</span>
          <span class="detail-value">${data.discountRate ? (data.discountRate * 10).toFixed(1) + '折' : '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">${formatTime(data.createTime)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">支付时间</span>
          <span class="detail-value">${formatTime(data.payTime)}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">卡券信息</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">卡号</span>
            <span class="detail-value">${data.cardNoDecrypt || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">卡密</span>
            <span class="detail-value">${data.cardPwdDecrypt || '-'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">买家信息</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">买家昵称</span>
            <span class="detail-value">${data.buyerNickname || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">手机号</span>
            <span class="detail-value">${data.buyerPhone || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">真实姓名</span>
            <span class="detail-value">${data.buyerRealName || '-'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">卖家信息</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">卖家昵称</span>
            <span class="detail-value">${data.sellerNickname || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">手机号</span>
            <span class="detail-value">${data.sellerPhone || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">真实姓名</span>
            <span class="detail-value">${data.sellerRealName || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">回收订单号</span>
            <span class="detail-value">${data.recycleOrderNo || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">回收金额</span>
            <span class="detail-value">${formatMoney(data.recycleAmount)}</span>
          </div>
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn-default" onclick="closeModal('orderDetailModal')">关闭</button>
    `;

    openModal('orderDetailModal');
  }
}

/**
 * 查看订单详情
 */
async function viewOrderDetail(orderId) {
  const data = await apiRequest('/order/detail?id=' + orderId);

  if (data) {
    const body = document.getElementById('orderDetailBody');
    const footer = document.getElementById('orderDetailFooter');

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">订单号</span>
          <span class="detail-value">${data.orderNo}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">状态</span>
          <span class="detail-value">${getStatusTag(data.status)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">卡券类型</span>
          <span class="detail-value">${data.cardTypeName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">面值金额</span>
          <span class="detail-value">${formatMoney(data.faceValue)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">回收金额</span>
          <span class="detail-value highlight">${formatMoney(data.recycleAmount)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">${formatTime(data.createTime)}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">卡券信息</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">卡号</span>
            <span class="detail-value">${data.cardNoDecrypt || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">卡密</span>
            <span class="detail-value">${data.cardPwdDecrypt || '-'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">用户信息</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">用户昵称</span>
            <span class="detail-value">${data.userNickname || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">手机号</span>
            <span class="detail-value">${data.userPhone || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">真实姓名</span>
            <span class="detail-value">${data.userRealName || '-'}</span>
          </div>
        </div>
      </div>

      ${data.failReason ? `
        <div class="detail-section">
          <div class="detail-section-title">失败原因</div>
          <div class="detail-item">
            <span class="detail-value" style="color:#F5222D">${data.failReason}</span>
          </div>
        </div>
      ` : ''}
    `;

    // 操作按钮（仅待处理/处理中状态显示）
    if (data.status === 'PENDING' || data.status === 'PROCESSING') {
      footer.innerHTML = `
        <button class="btn-default" onclick="closeModal('orderDetailModal')">关闭</button>
        <button class="btn-danger" onclick="closeModal('orderDetailModal'); showRejectModal(${data.id})">拒绝订单</button>
        <button class="btn-success" onclick="closeModal('orderDetailModal'); completeOrder(${data.id})">确认完结</button>
      `;
    } else {
      footer.innerHTML = `
        <button class="btn-default" onclick="closeModal('orderDetailModal')">关闭</button>
      `;
    }

    openModal('orderDetailModal');
  }
}

/**
 * 完结订单
 */
async function completeOrder(orderId) {
  if (!confirm('确认完结此订单？完结后回收金额将入账到用户余额。')) {
    return;
  }

  const result = await apiRequest('/order/complete', 'POST', { orderId });

  if (result) {
    showToast(`订单已完结，入账 ${formatMoney(result.recycleAmount)}`, 'success');
    loadOrders();
    loadDashboard();
  }
}

/**
 * 显示拒绝订单弹窗
 */
function showRejectModal(orderId) {
  currentRejectOrderId = orderId;
  document.getElementById('rejectReason').value = '';
  openModal('rejectModal');
}

/**
 * 拒绝订单
 */
async function doRejectOrder() {
  const failReason = document.getElementById('rejectReason').value;

  if (!failReason) {
    showToast('请输入拒绝原因', 'warning');
    return;
  }

  const result = await apiRequest('/order/reject', 'POST', {
    orderId: currentRejectOrderId,
    failReason
  });

  if (result) {
    closeModal('rejectModal');
    showToast('订单已拒绝', 'success');
    loadOrders();
    loadDashboard();
  }
}

// ========== 用户管理 ==========

/**
 * 加载用户列表
 */
async function loadUsers() {
  const phone = document.getElementById('filterUserPhone').value;
  const nickname = document.getElementById('filterUserNickname').value;

  const params = new URLSearchParams({
    page: currentUserPage,
    pageSize: currentUserPageSize
  });

  if (phone) params.append('phone', phone);
  if (nickname) params.append('nickname', nickname);

  const data = await apiRequest('/user/list?' + params.toString());

  if (data) {
    currentUserTotal = data.total;
    renderUserTable(data.list);
    renderUserPagination();
  }
}

/**
 * 渲染用户表格
 */
function renderUserTable(list) {
  const tbody = document.getElementById('userTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-row">暂无用户数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.nickname || '-'}</td>
      <td>${user.phone || '-'}</td>
      <td>${user.isVerified ? '<span class="status-tag success">已认证</span>' : '<span class="status-tag pending">未认证</span>'}</td>
      <td>${formatMoney(user.balance)}</td>
      <td>${formatMoney(user.totalRecycle)}</td>
      <td>${user.orderCount}</td>
      <td>${formatTime(user.createTime)}</td>
      <td>
        <button class="btn-info btn-sm" onclick="viewUserDetail(${user.id})">详情</button>
      </td>
    </tr>
  `).join('');
}

/**
 * 渲染用户分页
 */
function renderUserPagination() {
  const totalPages = Math.ceil(currentUserTotal / currentUserPageSize);
  const container = document.getElementById('userPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  html += `<button ${currentUserPage <= 1 ? 'disabled' : ''} onclick="goUserPage(${currentUserPage - 1})">上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentUserPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= 5 || i >= totalPages - 2 || Math.abs(i - currentUserPage) <= 2) {
      html += `<button onclick="goUserPage(${i})">${i}</button>`;
    } else if (i === 6 || i === totalPages - 3) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${currentUserPage >= totalPages ? 'disabled' : ''} onclick="goUserPage(${currentUserPage + 1})">下一页</button>`;
  html += `<span style="color:#999;font-size:13px;margin-left:10px;">共 ${currentUserTotal} 条</span>`;

  container.innerHTML = html;
}

/**
 * 用户分页跳转
 */
function goUserPage(page) {
  currentUserPage = page;
  loadUsers();
}

/**
 * 查看用户详情
 */
async function viewUserDetail(userId) {
  const data = await apiRequest('/user/detail?id=' + userId);

  if (data) {
    const user = data.userInfo;
    const body = document.getElementById('userDetailBody');

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">用户ID</span>
          <span class="detail-value">${user.id}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">昵称</span>
          <span class="detail-value">${user.nickname || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">手机号</span>
          <span class="detail-value">${user.phone || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">认证状态</span>
          <span class="detail-value">${user.isVerified ? '已认证' : '未认证'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">账户余额</span>
          <span class="detail-value highlight">${formatMoney(user.balance)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">累计回收</span>
          <span class="detail-value">${formatMoney(user.totalRecycle)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">订单数量</span>
          <span class="detail-value">${user.orderCount}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">注册时间</span>
          <span class="detail-value">${formatTime(user.createTime)}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">订单统计</div>
        <div class="detail-grid">
          ${(data.orderStats || []).map(stat => `
            <div class="detail-item">
              <span class="detail-label">${getStatusTag(stat.status)}</span>
              <span class="detail-value">${stat.count} 笔 / ${formatMoney(stat.totalAmount || 0)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">最近余额流水</div>
        <div class="balance-log-list">
          ${(data.balanceLogs || []).map(log => `
            <div class="balance-log-item">
              <span class="balance-log-type ${log.type === 'RECYCLE_INCOME' ? 'income' : 'expense'}">
                ${log.type === 'RECYCLE_INCOME' ? '回收收入' : log.type === 'WITHDRAW' ? '提现支出' : '管理员调整'}
              </span>
              <span class="balance-log-amount ${parseFloat(log.amount) > 0 ? 'positive' : 'negative'}">
                ${parseFloat(log.amount) > 0 ? '+' : ''}${formatMoney(log.amount)}
              </span>
              <span class="balance-log-remark">${log.remark || '-'}</span>
              <span class="balance-log-time">${formatTime(log.createTime)}</span>
            </div>
          `).join('')}
          ${(!data.balanceLogs || data.balanceLogs.length === 0) ? '<div style="color:#999;text-align:center;padding:20px;">暂无流水记录</div>' : ''}
        </div>
      </div>
    `;

    openModal('userDetailModal');
  }
}

// ========== 回收资产 ==========

/**
 * 加载回收资产汇总数据
 */
async function loadAssets() {
  // 加载卡券类型选项
  loadCardTypeOptions();

  const params = getAssetFilterParams();
  const data = await apiRequest('/assets/summary?' + params.toString());

  if (data) {
    assetSummaryData = data;
    // 更新统计卡片
    document.getElementById('statAssetTotalCount').textContent = data.totalCount;
    document.getElementById('statAssetTotalFaceValue').textContent = formatMoney(data.totalFaceValue);
    document.getElementById('statAssetTotalRecycleAmount').textContent = formatMoney(data.totalRecycleAmount);
    document.getElementById('statAssetCardTypeCount').textContent = data.cardTypeCount;

    // 渲染分类汇总表格
    renderAssetSummaryTable(data.cardTypeSummary);
  }
}

/**
 * 获取回收资产筛选参数
 */
function getAssetFilterParams() {
  const params = new URLSearchParams();
  const cardTypeName = document.getElementById('filterAssetCardType').value;
  const minFaceValue = document.getElementById('filterAssetMinFaceValue').value;
  const maxFaceValue = document.getElementById('filterAssetMaxFaceValue').value;
  const startDate = document.getElementById('filterAssetStartDate').value;
  const endDate = document.getElementById('filterAssetEndDate').value;
  const phone = document.getElementById('filterAssetPhone').value;

  if (cardTypeName) params.append('cardTypeName', cardTypeName);
  if (minFaceValue) params.append('minFaceValue', minFaceValue);
  if (maxFaceValue) params.append('maxFaceValue', maxFaceValue);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (phone) params.append('phone', phone);

  return params;
}

/**
 * 加载卡券类型选项
 */
async function loadCardTypeOptions() {
  const list = await apiRequest('/card-types');
  if (list) {
    const select = document.getElementById('filterAssetCardType');
    // 保留第一个"全部"选项
    select.innerHTML = '<option value="">全部卡券类型</option>';
    list.forEach(item => {
      select.innerHTML += `<option value="${item.name}">${item.name}</option>`;
    });
  }
}

/**
 * 渲染卡券分类汇总表格
 */
function renderAssetSummaryTable(list) {
  const tbody = document.getElementById('assetSummaryTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">暂无回收资产数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.cardTypeName}</td>
      <td>${item.totalCount}</td>
      <td>${formatMoney(item.totalFaceValue)}</td>
      <td>${formatMoney(item.totalRecycleAmount)}</td>
      <td>${item.avgDiscountRate}%</td>
      <td>
        <div class="action-btns">
          <button class="btn-info btn-sm" onclick="viewAssetFaceValueDistribution('${item.cardTypeName}')">面值分布</button>
          <button class="btn-success btn-sm" onclick="viewAssetDetail('${item.cardTypeName}')">查看明细</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 查看面值分布统计
 */
function viewAssetFaceValueDistribution(cardTypeName) {
  if (!assetSummaryData || !assetSummaryData.cardTypeSummary) return;

  const item = assetSummaryData.cardTypeSummary.find(i => i.cardTypeName === cardTypeName);
  if (!item || !item.faceValueDistribution || item.faceValueDistribution.length === 0) {
    showToast('该类型暂无面值分布数据', 'warning');
    return;
  }

  const section = document.getElementById('assetFaceValueSection');
  const title = document.getElementById('assetFaceValueTitle');
  const tbody = document.getElementById('assetFaceValueTableBody');

  title.textContent = `${cardTypeName} - 面值分布`;
  section.style.display = 'block';

  tbody.innerHTML = item.faceValueDistribution.map(fv => `
    <tr>
      <td>${formatMoney(fv.faceValue)}</td>
      <td>${fv.count}</td>
      <td>${formatMoney(fv.totalFaceValue)}</td>
      <td>${formatMoney(fv.totalRecycleAmount)}</td>
    </tr>
  `).join('');
}

/**
 * 查看卡券明细（弹窗）
 */
async function viewAssetDetail(cardTypeName) {
  currentAssetDetailCardType = cardTypeName;
  currentAssetDetailPage = 1;

  document.getElementById('assetDetailModalTitle').textContent = `${cardTypeName} - 卡券明细`;
  openModal('assetDetailModal');

  await loadAssetDetail();
}

/**
 * 加载卡券明细数据
 */
async function loadAssetDetail() {
  const params = getAssetFilterParams();
  params.append('cardTypeName', currentAssetDetailCardType);
  params.append('page', currentAssetDetailPage);
  params.append('pageSize', currentAssetDetailPageSize);

  const data = await apiRequest('/assets/detail?' + params.toString());

  if (data) {
    currentAssetDetailTotal = data.total;
    renderAssetDetailTable(data.list);
    renderAssetDetailPagination();
  }
}

/**
 * 渲染卡券明细表格
 */
function renderAssetDetailTable(list) {
  const tbody = document.getElementById('assetDetailTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-row">暂无明细数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.orderNo}</td>
      <td>${item.userNickname || '-'}</td>
      <td>${item.userPhone || '-'}</td>
      <td>${formatMoney(item.faceValue)}</td>
      <td>${formatMoney(item.recycleAmount)}</td>
      <td>${item.cardNoDecrypt || '-'}</td>
      <td>${item.cardPwdDecrypt || '-'}</td>
      <td>${formatTime(item.createTime)}</td>
      <td>${formatTime(item.completeTime)}</td>
    </tr>
  `).join('');
}

/**
 * 渲染卡券明细分页
 */
function renderAssetDetailPagination() {
  const totalPages = Math.ceil(currentAssetDetailTotal / currentAssetDetailPageSize);
  const container = document.getElementById('assetDetailPagination');

  if (totalPages <= 1) {
    container.innerHTML = `<span style="color:#999;font-size:13px;">共 ${currentAssetDetailTotal} 条</span>`;
    return;
  }

  let html = '';
  html += `<button ${currentAssetDetailPage <= 1 ? 'disabled' : ''} onclick="goAssetDetailPage(${currentAssetDetailPage - 1})">上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentAssetDetailPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= 5 || i >= totalPages - 2 || Math.abs(i - currentAssetDetailPage) <= 2) {
      html += `<button onclick="goAssetDetailPage(${i})">${i}</button>`;
    } else if (i === 6 || i === totalPages - 3) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${currentAssetDetailPage >= totalPages ? 'disabled' : ''} onclick="goAssetDetailPage(${currentAssetDetailPage + 1})">下一页</button>`;
  html += `<span style="color:#999;font-size:13px;margin-left:10px;">共 ${currentAssetDetailTotal} 条</span>`;

  container.innerHTML = html;
}

/**
 * 卡券明细分页跳转
 */
function goAssetDetailPage(page) {
  currentAssetDetailPage = page;
  loadAssetDetail();
}

/**
 * 导出回收资产Excel
 */
function exportAssets() {
  // 检查导出权限
  if (adminRole === 'OPERATOR') {
    showToast('仅管理员可导出数据', 'warning');
    return;
  }

  const params = getAssetFilterParams();
  // 直接打开下载链接
  const url = API_BASE + '/assets/export?' + params.toString();

  // 使用fetch下载
  fetch(url, {
    headers: {
      'Authorization': adminToken ? `Bearer ${adminToken}` : ''
    }
  }).then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        showToast(data.message || '导出失败', 'error');
      });
    }
    return response.blob();
  }).then(blob => {
    if (blob) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `回收资产_${dateStr}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('导出成功', 'success');
    }
  }).catch(err => {
    showToast('导出失败: ' + err.message, 'error');
  });
}

// ========== 已销售资产 ==========

/**
 * 获取已销售资产筛选参数
 */
function getSoldAssetFilterParams() {
  const params = new URLSearchParams();
  const cardTypeName = document.getElementById('filterSoldCardType').value;
  const minFaceValue = document.getElementById('filterSoldMinFaceValue').value;
  const maxFaceValue = document.getElementById('filterSoldMaxFaceValue').value;
  const startDate = document.getElementById('filterSoldStartDate').value;
  const endDate = document.getElementById('filterSoldEndDate').value;
  const sellerPhone = document.getElementById('filterSoldSellerPhone').value;
  const buyerPhone = document.getElementById('filterSoldBuyerPhone').value;

  if (cardTypeName) params.append('cardTypeName', cardTypeName);
  if (minFaceValue) params.append('minFaceValue', minFaceValue);
  if (maxFaceValue) params.append('maxFaceValue', maxFaceValue);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (sellerPhone) params.append('sellerPhone', sellerPhone);
  if (buyerPhone) params.append('buyerPhone', buyerPhone);

  return params;
}

/**
 * 加载已销售资产汇总数据
 */
async function loadSoldAssets() {
  loadCardTypeOptionsForSold();

  const params = getSoldAssetFilterParams();
  const data = await apiRequest('/sold-assets/summary?' + params.toString());

  if (data) {
    soldAssetSummaryData = data;
    document.getElementById('statSoldTotalCount').textContent = data.totalCount;
    document.getElementById('statSoldTotalFaceValue').textContent = formatMoney(data.totalFaceValue);
    document.getElementById('statSoldTotalBuyAmount').textContent = formatMoney(data.totalBuyAmount);
    document.getElementById('statSoldCardTypeCount').textContent = data.cardTypeCount;

    renderSoldAssetSummaryTable(data.cardTypeSummary);
  }
}

/**
 * 加载已销售资产卡券类型选项
 */
async function loadCardTypeOptionsForSold() {
  const list = await apiRequest('/card-types');
  if (list) {
    const select = document.getElementById('filterSoldCardType');
    select.innerHTML = '<option value="">全部卡券类型</option>';
    list.forEach(item => {
      select.innerHTML += `<option value="${item.name}">${item.name}</option>`;
    });
  }
}

/**
 * 渲染已销售资产分类汇总表格
 */
function renderSoldAssetSummaryTable(list) {
  const tbody = document.getElementById('soldAssetSummaryTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">暂无已销售资产数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.cardTypeName}</td>
      <td>${item.totalCount}</td>
      <td>${formatMoney(item.totalFaceValue)}</td>
      <td>${formatMoney(item.totalRecycleAmount)}</td>
      <td>${formatMoney(item.totalBuyAmount)}</td>
      <td>${item.avgDiscountRate}%</td>
      <td>
        <div class="action-btns">
          <button class="btn-info btn-sm" onclick="viewSoldAssetFaceValueDistribution('${item.cardTypeName}')">面值分布</button>
          <button class="btn-success btn-sm" onclick="viewSoldAssetDetail('${item.cardTypeName}')">查看明细</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 查看已销售资产面值分布
 */
function viewSoldAssetFaceValueDistribution(cardTypeName) {
  if (!soldAssetSummaryData || !soldAssetSummaryData.cardTypeSummary) return;

  const item = soldAssetSummaryData.cardTypeSummary.find(i => i.cardTypeName === cardTypeName);
  if (!item || !item.faceValueDistribution || item.faceValueDistribution.length === 0) {
    showToast('该类型暂无面值分布数据', 'warning');
    return;
  }

  const section = document.getElementById('soldAssetFaceValueSection');
  const title = document.getElementById('soldAssetFaceValueTitle');
  const tbody = document.getElementById('soldAssetFaceValueTableBody');

  title.textContent = `${cardTypeName} - 面值分布`;
  section.style.display = 'block';

  tbody.innerHTML = item.faceValueDistribution.map(fv => `
    <tr>
      <td>${formatMoney(fv.faceValue)}</td>
      <td>${fv.count}</td>
      <td>${formatMoney(fv.totalFaceValue)}</td>
      <td>${formatMoney(fv.totalRecycleAmount)}</td>
      <td>${formatMoney(fv.totalBuyAmount)}</td>
    </tr>
  `).join('');
}

/**
 * 查看已销售资产明细（弹窗）
 */
async function viewSoldAssetDetail(cardTypeName) {
  currentSoldAssetDetailCardType = cardTypeName;
  currentSoldAssetDetailPage = 1;

  document.getElementById('soldAssetDetailModalTitle').textContent = `${cardTypeName} - 已销售卡券明细`;
  openModal('soldAssetDetailModal');

  await loadSoldAssetDetail();
}

/**
 * 加载已销售资产明细数据
 */
async function loadSoldAssetDetail() {
  const params = getSoldAssetFilterParams();
  params.append('cardTypeName', currentSoldAssetDetailCardType);
  params.append('page', currentSoldAssetDetailPage);
  params.append('pageSize', currentSoldAssetDetailPageSize);

  const data = await apiRequest('/sold-assets/detail?' + params.toString());

  if (data) {
    currentSoldAssetDetailTotal = data.total;
    renderSoldAssetDetailTable(data.list);
    renderSoldAssetDetailPagination();
  }
}

/**
 * 渲染已销售资产明细表格
 */
function renderSoldAssetDetailTable(list) {
  const tbody = document.getElementById('soldAssetDetailTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="empty-row">暂无明细数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.orderNo}</td>
      <td>${item.sellerNickname || '-'}</td>
      <td>${item.sellerPhone || '-'}</td>
      <td>${formatMoney(item.faceValue)}</td>
      <td>${formatMoney(item.recycleAmount)}</td>
      <td>${formatMoney(item.buyPrice)}</td>
      <td>${item.buyerNickname || '-'}</td>
      <td>${item.buyerPhone || '-'}</td>
      <td>${item.buyOrderNo || '-'}</td>
      <td>${item.cardNoDecrypt || '-'}</td>
      <td>${item.cardPwdDecrypt || '-'}</td>
      <td>${formatTime(item.completeTime)}</td>
      <td>${item.soldTime || '-'}</td>
    </tr>
  `).join('');
}

/**
 * 渲染已销售资产明细分页
 */
function renderSoldAssetDetailPagination() {
  const totalPages = Math.ceil(currentSoldAssetDetailTotal / currentSoldAssetDetailPageSize);
  const container = document.getElementById('soldAssetDetailPagination');

  if (totalPages <= 1) {
    container.innerHTML = `<span style="color:#999;font-size:13px;">共 ${currentSoldAssetDetailTotal} 条</span>`;
    return;
  }

  let html = '';
  html += `<button ${currentSoldAssetDetailPage <= 1 ? 'disabled' : ''} onclick="goSoldAssetDetailPage(${currentSoldAssetDetailPage - 1})">上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentSoldAssetDetailPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= 5 || i >= totalPages - 2 || Math.abs(i - currentSoldAssetDetailPage) <= 2) {
      html += `<button onclick="goSoldAssetDetailPage(${i})">${i}</button>`;
    } else if (i === 6 || i === totalPages - 3) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${currentSoldAssetDetailPage >= totalPages ? 'disabled' : ''} onclick="goSoldAssetDetailPage(${currentSoldAssetDetailPage + 1})">下一页</button>`;
  html += `<span style="color:#999;font-size:13px;margin-left:10px;">共 ${currentSoldAssetDetailTotal} 条</span>`;

  container.innerHTML = html;
}

/**
 * 已销售资产明细分页跳转
 */
function goSoldAssetDetailPage(page) {
  currentSoldAssetDetailPage = page;
  loadSoldAssetDetail();
}

/**
 * 导出已销售资产Excel
 */
function exportSoldAssets() {
  if (adminRole === 'OPERATOR') {
    showToast('仅管理员可导出数据', 'warning');
    return;
  }

  const params = getSoldAssetFilterParams();
  const url = API_BASE + '/sold-assets/export?' + params.toString();

  fetch(url, {
    headers: {
      'Authorization': adminToken ? `Bearer ${adminToken}` : ''
    }
  }).then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        showToast(data.message || '导出失败', 'error');
      });
    }
    return response.blob();
  }).then(blob => {
    if (blob) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `已销售资产_${dateStr}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('导出成功', 'success');
    }
  }).catch(err => {
    showToast('导出失败: ' + err.message, 'error');
  });
}

// ========== 可销售资产 ==========

/**
 * 获取可销售资产筛选参数
 */
function getAvailableAssetFilterParams() {
  const params = new URLSearchParams();
  const cardTypeName = document.getElementById('filterAvailableCardType').value;
  const minFaceValue = document.getElementById('filterAvailableMinFaceValue').value;
  const maxFaceValue = document.getElementById('filterAvailableMaxFaceValue').value;
  const startDate = document.getElementById('filterAvailableStartDate').value;
  const endDate = document.getElementById('filterAvailableEndDate').value;
  const sellerPhone = document.getElementById('filterAvailableSellerPhone').value;

  if (cardTypeName) params.append('cardTypeName', cardTypeName);
  if (minFaceValue) params.append('minFaceValue', minFaceValue);
  if (maxFaceValue) params.append('maxFaceValue', maxFaceValue);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (sellerPhone) params.append('sellerPhone', sellerPhone);

  return params;
}

/**
 * 加载可销售资产汇总数据
 */
async function loadAvailableAssets() {
  loadCardTypeOptionsForAvailable();

  const params = getAvailableAssetFilterParams();
  const data = await apiRequest('/available-assets/summary?' + params.toString());

  if (data) {
    availableAssetSummaryData = data;
    document.getElementById('statAvailableTotalCount').textContent = data.totalCount;
    document.getElementById('statAvailableTotalFaceValue').textContent = formatMoney(data.totalFaceValue);
    document.getElementById('statAvailableEstimatedBuyAmount').textContent = formatMoney(data.estimatedBuyAmount);
    document.getElementById('statAvailableCardTypeCount').textContent = data.cardTypeCount;

    renderAvailableAssetSummaryTable(data.cardTypeSummary);
  }
}

/**
 * 加载可销售资产卡券类型选项
 */
async function loadCardTypeOptionsForAvailable() {
  const list = await apiRequest('/card-types');
  if (list) {
    const select = document.getElementById('filterAvailableCardType');
    select.innerHTML = '<option value="">全部卡券类型</option>';
    list.forEach(item => {
      select.innerHTML += `<option value="${item.name}">${item.name}</option>`;
    });
  }
}

/**
 * 渲染可销售资产分类汇总表格
 */
function renderAvailableAssetSummaryTable(list) {
  const tbody = document.getElementById('availableAssetSummaryTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">暂无可销售资产数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.cardTypeName}</td>
      <td>${item.totalCount}</td>
      <td>${formatMoney(item.totalFaceValue)}</td>
      <td>${formatMoney(item.totalRecycleAmount)}</td>
      <td>${formatMoney(item.estimatedBuyAmount)}</td>
      <td>${item.avgDiscountRate}%</td>
      <td>
        <div class="action-btns">
          <button class="btn-info btn-sm" onclick="viewAvailableAssetFaceValueDistribution('${item.cardTypeName}')">面值分布</button>
          <button class="btn-success btn-sm" onclick="viewAvailableAssetDetail('${item.cardTypeName}')">查看明细</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 查看可销售资产面值分布
 */
function viewAvailableAssetFaceValueDistribution(cardTypeName) {
  if (!availableAssetSummaryData || !availableAssetSummaryData.cardTypeSummary) return;

  const item = availableAssetSummaryData.cardTypeSummary.find(i => i.cardTypeName === cardTypeName);
  if (!item || !item.faceValueDistribution || item.faceValueDistribution.length === 0) {
    showToast('该类型暂无面值分布数据', 'warning');
    return;
  }

  const section = document.getElementById('availableAssetFaceValueSection');
  const title = document.getElementById('availableAssetFaceValueTitle');
  const tbody = document.getElementById('availableAssetFaceValueTableBody');

  title.textContent = `${cardTypeName} - 面值分布`;
  section.style.display = 'block';

  tbody.innerHTML = item.faceValueDistribution.map(fv => `
    <tr>
      <td>${formatMoney(fv.faceValue)}</td>
      <td>${fv.count}</td>
      <td>${formatMoney(fv.totalFaceValue)}</td>
      <td>${formatMoney(fv.totalRecycleAmount)}</td>
      <td>${formatMoney(fv.estimatedBuyAmount)}</td>
    </tr>
  `).join('');
}

/**
 * 查看可销售资产明细（弹窗）
 */
async function viewAvailableAssetDetail(cardTypeName) {
  currentAvailableAssetDetailCardType = cardTypeName;
  currentAvailableAssetDetailPage = 1;

  document.getElementById('availableAssetDetailModalTitle').textContent = `${cardTypeName} - 可销售卡券明细`;
  openModal('availableAssetDetailModal');

  await loadAvailableAssetDetail();
}

/**
 * 加载可销售资产明细数据
 */
async function loadAvailableAssetDetail() {
  const params = getAvailableAssetFilterParams();
  params.append('cardTypeName', currentAvailableAssetDetailCardType);
  params.append('page', currentAvailableAssetDetailPage);
  params.append('pageSize', currentAvailableAssetDetailPageSize);

  const data = await apiRequest('/available-assets/detail?' + params.toString());

  if (data) {
    currentAvailableAssetDetailTotal = data.total;
    renderAvailableAssetDetailTable(data.list);
    renderAvailableAssetDetailPagination();
  }
}

/**
 * 渲染可销售资产明细表格
 */
function renderAvailableAssetDetailTable(list) {
  const tbody = document.getElementById('availableAssetDetailTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-row">暂无明细数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.orderNo}</td>
      <td>${item.sellerNickname || '-'}</td>
      <td>${item.sellerPhone || '-'}</td>
      <td>${formatMoney(item.faceValue)}</td>
      <td>${formatMoney(item.recycleAmount)}</td>
      <td>${(item.discountRate * 10).toFixed(1)}折</td>
      <td>${formatMoney(item.buyPrice)}</td>
      <td>${item.cardNoDecrypt || '-'}</td>
      <td>${item.cardPwdDecrypt || '-'}</td>
      <td>${formatTime(item.completeTime)}</td>
    </tr>
  `).join('');
}

/**
 * 渲染可销售资产明细分页
 */
function renderAvailableAssetDetailPagination() {
  const totalPages = Math.ceil(currentAvailableAssetDetailTotal / currentAvailableAssetDetailPageSize);
  const container = document.getElementById('availableAssetDetailPagination');

  if (totalPages <= 1) {
    container.innerHTML = `<span style="color:#999;font-size:13px;">共 ${currentAvailableAssetDetailTotal} 条</span>`;
    return;
  }

  let html = '';
  html += `<button ${currentAvailableAssetDetailPage <= 1 ? 'disabled' : ''} onclick="goAvailableAssetDetailPage(${currentAvailableAssetDetailPage - 1})">上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentAvailableAssetDetailPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= 5 || i >= totalPages - 2 || Math.abs(i - currentAvailableAssetDetailPage) <= 2) {
      html += `<button onclick="goAvailableAssetDetailPage(${i})">${i}</button>`;
    } else if (i === 6 || i === totalPages - 3) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${currentAvailableAssetDetailPage >= totalPages ? 'disabled' : ''} onclick="goAvailableAssetDetailPage(${currentAvailableAssetDetailPage + 1})">下一页</button>`;
  html += `<span style="color:#999;font-size:13px;margin-left:10px;">共 ${currentAvailableAssetDetailTotal} 条</span>`;

  container.innerHTML = html;
}

/**
 * 可销售资产明细分页跳转
 */
function goAvailableAssetDetailPage(page) {
  currentAvailableAssetDetailPage = page;
  loadAvailableAssetDetail();
}

/**
 * 导出可销售资产Excel
 */
function exportAvailableAssets() {
  if (adminRole === 'OPERATOR') {
    showToast('仅管理员可导出数据', 'warning');
    return;
  }

  const params = getAvailableAssetFilterParams();
  const url = API_BASE + '/available-assets/export?' + params.toString();

  fetch(url, {
    headers: {
      'Authorization': adminToken ? `Bearer ${adminToken}` : ''
    }
  }).then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        showToast(data.message || '导出失败', 'error');
      });
    }
    return response.blob();
  }).then(blob => {
    if (blob) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `可销售资产_${dateStr}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('导出成功', 'success');
    }
  }).catch(err => {
    showToast('导出失败: ' + err.message, 'error');
  });
}

// ========== 初始化 ==========

// 检查是否已登录
if (adminToken) {
  // 验证token有效性
  apiRequest('/info').then(data => {
    if (data) {
      document.getElementById('adminName').textContent = data.realName || data.username;
      document.getElementById('loginPage').classList.remove('active');
      document.getElementById('mainPage').classList.add('active');
      loadDashboard();
    } else {
      doLogout();
    }
  });
}

// ========== 事件监听器初始化 ==========
function initEventListeners() {
  // 登录按钮
  document.getElementById('loginBtn').addEventListener('click', doLogin);

  // 退出登录按钮
  document.getElementById('logoutBtn').addEventListener('click', doLogout);

  // 菜单点击事件
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
      const page = this.getAttribute('data-menu');
      switchPage(page);
    });
  });

  // 订单筛选
  document.getElementById('filterStatus').addEventListener('change', loadOrders);
  document.getElementById('filterOrderNo').addEventListener('keyup', loadOrders);
  document.getElementById('refreshOrdersBtn').addEventListener('click', loadOrders);

  // 订单Tab切换
  document.querySelectorAll('.order-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      switchOrderTab(this.dataset.tab);
    });
  });

  // 买家订单筛选
  document.getElementById('filterBuyOrderStatus').addEventListener('change', loadBuyOrders);
  document.getElementById('filterBuyOrderNo').addEventListener('keyup', loadBuyOrders);
  document.getElementById('refreshBuyOrdersBtn').addEventListener('click', loadBuyOrders);

  // 用户筛选
  document.getElementById('filterUserPhone').addEventListener('keyup', loadUsers);
  document.getElementById('filterUserNickname').addEventListener('keyup', loadUsers);
  document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);

  // 回收资产筛选
  document.getElementById('filterAssetCardType').addEventListener('change', loadAssets);
  document.getElementById('filterAssetMinFaceValue').addEventListener('keyup', loadAssets);
  document.getElementById('filterAssetMaxFaceValue').addEventListener('keyup', loadAssets);
  document.getElementById('filterAssetStartDate').addEventListener('change', loadAssets);
  document.getElementById('filterAssetEndDate').addEventListener('change', loadAssets);
  document.getElementById('filterAssetPhone').addEventListener('keyup', loadAssets);
  document.getElementById('refreshAssetsBtn').addEventListener('click', loadAssets);
  document.getElementById('exportAssetsBtn').addEventListener('click', exportAssets);
  document.getElementById('refreshSoldAssetsBtn').addEventListener('click', loadSoldAssets);
  document.getElementById('exportSoldAssetsBtn').addEventListener('click', exportSoldAssets);
  document.getElementById('refreshAvailableAssetsBtn').addEventListener('click', loadAvailableAssets);
  document.getElementById('exportAvailableAssetsBtn').addEventListener('click', exportAvailableAssets);

  // 模态框关闭按钮
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', function() {
      const modalId = this.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // 确认拒绝按钮
  document.getElementById('confirmRejectBtn').addEventListener('click', doRejectOrder);

  // 事件委托 - 订单表格操作按钮
  document.getElementById('orderTableBody').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      const onclick = target.getAttribute('onclick');
      if (onclick) {
        // 解析onclick属性并执行对应函数
        if (onclick.includes('viewOrderDetail')) {
          const match = onclick.match(/viewOrderDetail\((\d+)\)/);
          if (match) viewOrderDetail(parseInt(match[1]));
        } else if (onclick.includes('completeOrder')) {
          const match = onclick.match(/completeOrder\((\d+)\)/);
          if (match) completeOrder(parseInt(match[1]));
        } else if (onclick.includes('showRejectModal')) {
          const match = onclick.match(/showRejectModal\((\d+)\)/);
          if (match) showRejectModal(parseInt(match[1]));
        }
      }
    }
  });

  // 事件委托 - 订单分页按钮
  document.getElementById('orderPagination').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON' && target.getAttribute('onclick')) {
      const onclick = target.getAttribute('onclick');
      const match = onclick.match(/goOrderPage\((\d+)\)/);
      if (match) goOrderPage(parseInt(match[1]));
    }
  });

  // 事件委托 - 买家订单表格操作按钮
  document.getElementById('buyOrderTableBody').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      const onclick = target.getAttribute('onclick');
      if (onclick && onclick.includes('viewBuyOrderDetail')) {
        const match = onclick.match(/viewBuyOrderDetail\((\d+)\)/);
        if (match) viewBuyOrderDetail(parseInt(match[1]));
      }
    }
  });

  // 事件委托 - 买家订单分页按钮
  document.getElementById('buyOrderPagination').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON' && target.getAttribute('onclick')) {
      const onclick = target.getAttribute('onclick');
      const match = onclick.match(/goBuyOrderPage\((\d+)\)/);
      if (match) goBuyOrderPage(parseInt(match[1]));
    }
  });

  // 事件委托 - 用户表格操作按钮
  document.getElementById('userTableBody').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      const onclick = target.getAttribute('onclick');
      if (onclick && onclick.includes('viewUserDetail')) {
        const match = onclick.match(/viewUserDetail\((\d+)\)/);
        if (match) viewUserDetail(parseInt(match[1]));
      }
    }
  });

  // 事件委托 - 用户分页按钮
  document.getElementById('userPagination').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON' && target.getAttribute('onclick')) {
      const onclick = target.getAttribute('onclick');
      const match = onclick.match(/goUserPage\((\d+)\)/);
      if (match) goUserPage(parseInt(match[1]));
    }
  });

  // 事件委托 - 订单详情弹窗底部按钮
  document.getElementById('orderDetailFooter').addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      const onclick = target.getAttribute('onclick');
      if (onclick) {
        if (onclick.includes('closeModal') && onclick.includes('showRejectModal')) {
          const match1 = onclick.match(/closeModal\('(\w+)'\)/);
          const match2 = onclick.match(/showRejectModal\((\d+)\)/);
          if (match1) closeModal(match1[1]);
          if (match2) showRejectModal(parseInt(match2[1]));
        } else if (onclick.includes('closeModal') && onclick.includes('completeOrder')) {
          const match1 = onclick.match(/closeModal\('(\w+)'\)/);
          const match2 = onclick.match(/completeOrder\((\d+)\)/);
          if (match1) closeModal(match1[1]);
          if (match2) completeOrder(parseInt(match2[1]));
        } else if (onclick.includes('closeModal')) {
          const match = onclick.match(/closeModal\('(\w+)'\)/);
          if (match) closeModal(match[1]);
        }
      }
    }
  });
}

// 页面加载完成后初始化事件监听器
document.addEventListener('DOMContentLoaded', initEventListeners);