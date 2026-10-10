/**
 * 以应用已登录的网易云账号代发请求
 *
 * 复用应用自己的网易云请求层（`createRequest` 的 `api` 明文模式），因此自动获得：
 * cookie 注入、客户端身份字段（osver / appver / versioncode …）、系统代理与重试。
 * 插件拿不到凭据本身，只能借宿主的名义发请求 —— 这也是它需要单独 `netease` 权限的原因。
 */

import { getNeteaseCookies } from "@main/apis/netease";
import { DOMAIN } from "@main/apis/netease/core/config";
import { createRequest } from "@main/apis/netease/core/request";
import { PluginErrorCodes } from "@shared/defaults/plugin-api";

/** 只放行明文 `/api/` 路径；weapi / eapi 等加密入口不开放 */
const ALLOWED_PREFIX = "/api/";

export const pluginNeteaseRequest = async (
  path: string,
  data: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> => {
  if (typeof path !== "string" || !path.startsWith(ALLOWED_PREFIX)) {
    throw Object.assign(new Error(`only "${ALLOWED_PREFIX}" paths are allowed: ${path}`), {
      code: PluginErrorCodes.URL_NOT_ALLOWED,
    });
  }

  const cookie = getNeteaseCookies();
  if (!cookie.MUSIC_U) {
    throw Object.assign(new Error("SPlayer is not logged in to NetEase Cloud Music"), {
      code: PluginErrorCodes.NOT_LOGGED_IN,
    });
  }

  const { status, body } = await createRequest(
    path,
    { ...data },
    {
      crypto: "api",
      cookie,
      // 用 music.163.com 而非默认的 interface.music.163.com：一起听接口是在前者上实测通过的
      domain: DOMAIN,
    },
  );

  return { status, body: body as Record<string, unknown> };
};
