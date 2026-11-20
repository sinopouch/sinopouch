# SinoPouch 外贸网站（带后台版）

纯静态网站 + Decap CMS 可视化后台。**你在后台改联系方式、产品、文案，网站自动更新。**

## 一、网站结构

```
sinopouch-site/
├── index.html / products.html / oem.html / certifications.html / contact.html
├── coffee-bags.html / mylar-bags.html / pet-food-bags.html / bread-bags.html
├── spout-pouches.html / special-shaped-bags.html / stand-up-pouches.html   ← 7 个分类独立页（含 Banner）
├── admin/
│   ├── index.html        ← 后台登录入口（访问 sinopouch.com/admin）
│   └── config.yml        ← 后台字段定义
├── data/
│   ├── site.json         ← 联系方式（邮箱/WhatsApp/地址）
│   ├── products.json     ← 7 个产品分类
│   └── content.json      ← 首页标语、CTA 文案
├── assets/
│   ├── logo.svg / style.css / main.js
│   └── render.js         ← 把 data 里的数据显示到页面
├── sitemap.xml / robots.txt
```

**工作原理**：后台改的是 `data/*.json` → 存到 GitHub → 网站自动重新发布 → `render.js` 读取新数据显示出来。

## 二、上线步骤（照着做，约 30 分钟）

### 第 1 步：创建 GitHub 账号和仓库

1. 打开 github.com 注册账号（用你长期邮箱，比如那个 163）
2. 点右上角 `+` → New repository
3. Repository name 填 `sinopouch`，选 **Public**（公开，免费的才能用后台），点 Create repository

### 第 2 步：把网站文件传到 GitHub

最简单的方式——用网页上传：
1. 在新建的仓库页面点 `uploading an existing file`
2. 把 `sinopouch-site` 文件夹里的**所有文件和文件夹**（index.html、admin、data、assets 等）全选拖进去
3. 拉到页面底部点 `Commit changes`

> 注意：是上传文件夹**里面的内容**，不是把 sinopouch-site 这个文件夹整个传上去。

### 第 3 步：用 Cloudflare Pages 发布网站

1. 注册并登录 dash.cloudflare.com
2. 左侧菜单 Workers & Pages → Create → Pages → Connect to Git
3. 选 GitHub → 授权 → 选择 `sinopouch` 仓库 → Begin setup
4. 构建设置（Build settings）这样填：
   - Project name: `sinopouch`
   - Production branch: `main`
   - **Build command: 留空**
   - **Build output directory: `/`**（根目录）
5. 点 Save and Deploy，等 1-2 分钟，得到一个 `sinopouch.pages.dev` 网址

### 第 4 步：绑定你的域名

1. 在 Cloudflare Pages 项目里 → Settings → Custom domains → Set up a custom domain → 输入 `sinopouch.com`
2. Cloudflare 会提示添加 DNS 记录 → 按提示去 **Gname 后台**添加那条 CNAME 记录
3. 等几分钟生效，之后访问 `sinopouch.com` 就是你的网站
4. SSL 证书 Cloudflare 免费自动配好，不用管

### 第 5 步：开通后台（关键，让 sinopouch.com/admin 能登录）

后台用 GitHub 账号登录，需要先创建一个 GitHub OAuth 应用，拿到一个 Client ID：

1. 打开 github.com/settings/developers → OAuth Apps → New OAuth App
2. 按下面填：
   - Application name: `SinoPouch CMS`
   - Homepage URL: `https://sinopouch.com`
   - Authorization callback URL: `https://sinopouch.com/admin/index.html`
3. 点 Register application，复制页面上的 **Client ID**（不用生成 secret）

### 第 6 步：把两处信息填进后台配置

在 GitHub 仓库里打开 `admin/config.yml` 文件，点编辑，改两处带 ★★★ 的地方：

```yaml
backend:
  name: github
  repo: 你的GitHub用户名/sinopouch      # ← 改成你的用户名
  branch: main
  auth_type: pkce
  app_id: 你的Client ID                 # ← 改成第 5 步复制的 Client ID
```

改完 Commit 保存，Cloudflare 会自动重新部署（1-2 分钟）。

> 完成后访问 `https://sinopouch.com/admin`，点 Login with GitHub，用 GitHub 账号登录，就能看到中文后台了。

## 三、后台怎么改内容

登录 `sinopouch.com/admin` 后，左侧有三个菜单：

| 菜单 | 你能改什么 |
|---|---|
| **联系方式** | 邮箱、WhatsApp、地址、工作时间 —— **你的真实信息在这里填** |
| **产品分类** | 添加/删除/修改 7 个产品，含名称、描述、图标、应用场景、详情页面链接 |
| **网站文案** | 首页大标题、副标题、按钮文字 |

> 首页产品预览显示前 6 个分类（排 2 行）；Products 页显示全部 7 个。每个产品卡片点 "View details" 进入对应分类独立页。想调整首页显示几个，改 `index.html` 里产品网格的 `data-limit` 数值。

**改完一定要点右上角 `Publish`（发布）**，改动才会同步到网站。通常 1-2 分钟后网站更新。

### 常见操作

- **改电话/邮箱**：联系方式 → 联系信息 → 改完 Publish
- **加一个新产品**：产品分类 → 全部产品 → 点 `+` 添加 → 填字段 → Publish
- **删产品**：产品分类 → 产品条目右侧点删除 → Publish

## 四、注意事项

1. **后台脚本走 CDN**：admin/index.html 从 jsdelivr 加载 CMS 脚本，国内偶尔慢。若打不开，多刷新或用手机热点。
2. **WhatsApp 两个字段**：
   - `WhatsApp 显示号码`：客户看到的文字，如 `+86 138 0000 0000`
   - `WhatsApp 链接号码`：**纯数字**，如 `8613800000000`（点按钮跳转用），别带 `+` 和空格
3. **每次改完点 Publish**，否则改动只在草稿。
4. **GitHub 仓库保持 Public**，否则 Cloudflare 读不到、后台用不了。

## 五、以后想换内容/加功能

改文案、加页面、换配色都可以直接告诉我，我改好文件后你在 GitHub 更新即可。
