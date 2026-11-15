"""영상 모드 히어로: 흑연 그림을 '만화 표지처럼 찢어진 종이'로 나눈다. (레퍼런스: 무협 웹툰 오프닝 표지)
  tear-frame.webp : 얼굴을 지나는 비스듬한 띠가 찢겨 나간 그림.
                    찢긴 가장자리 = 두껍고 들쭉날쭉한 흰 종이 속살(섬유) + 속살 안쪽 옅은 회색 결 + 구멍 안 그림자
  tear-strip.webp : 찢겨 나가는 띠 조각 (사이트에서 왼쪽부터 들리며 뜯겨 나감)
찢기기 전에는 profile-sketch.webp(온전한 그림)를 맨 위에 보여줌.
그림(profile-sketch.webp)을 바꾸면 다시 실행:
  uv run --with pillow --with numpy python images/hero/make-tear.py
"""
import numpy as np
from PIL import Image

src = Image.open('images/hero/profile-sketch.webp').convert('RGBA')
W, H = src.size
arr = np.asarray(src, np.float32)
person = arr[..., 3] / 255
rng = np.random.default_rng(11)
xs = np.arange(W, dtype=np.float32)

def wobble(step, amp):
    """step px 간격 점을 이은 흔들림 (step이 작으면 뾰족뾰족, 크면 완만한 굴곡)"""
    px = np.cumsum(rng.uniform(step * 0.5, step * 1.5, W // max(1, int(step * 0.5)) + 3)) - step
    return np.interp(xs, px, rng.uniform(-amp, amp, len(px)))

def tear_line(y0, y1):
    """왼쪽 y0% → 오른쪽 y1%로 비스듬히. 큰 굴곡 + 중간 굴곡 + 잘게 뜯긴 지그재그"""
    base = (y0 + (y1 - y0) * xs / W) * H / 100
    return base + wobble(130, 18) + wobble(34, 7) + wobble(6, 2.5)

def band(lo, hi, d):
    """lo < d < hi 이면 1 (경계 1px 부드럽게)"""
    return np.clip(d - lo + 0.5, 0, 1) * np.clip(hi - d + 0.5, 0, 1)

# 오른쪽으로 갈수록 올라가는 비스듬한 띠: 왼쪽 눈썹 위 ~ 턱 아래
top, bot = tear_line(25, 13), tear_line(50, 37)
Y = np.arange(H, dtype=np.float32)[:, None]
d_top = Y - top[None, :]      # 윗선 아래쪽이 +
d_bot = bot[None, :] - Y      # 아랫선 위쪽이 +
hole = np.clip(np.minimum(d_top, d_bot) + 0.5, 0, 1)

white = np.array([252, 251, 247], np.float32)
rgb = arr[..., :3].copy()
a = person * (1 - hole)
shadow = np.zeros((H, W), np.float32)

for d in (d_top, d_bot):
    # 흰 종이 속살: 두께 3~22px, 바깥 경계도 따로 들쭉날쭉 (찢긴 종이 섬유)
    fiber = np.clip(9 + wobble(55, 9) + wobble(8, 3), 3, 22)[None, :]
    fw = band(-fiber, 0, d) * (1 - hole)
    # 속살 안쪽(그림 쪽 경계)은 옅은 회색 결로 종이 두께 느낌
    t = np.clip(-d / np.maximum(fiber, 1), 0, 1)
    tone = white * (1 - 0.10 * t[..., None] ** 2)
    rgb = rgb * (1 - fw[..., None]) + tone * fw[..., None]
    # 구멍 안쪽 그림자: 찢긴 종이가 살짝 떠 있는 느낌 (10px)
    shadow = np.maximum(shadow, np.clip(1 - d / 12, 0, 1) ** 2 * 0.38 * (d > 0))

shadow *= hole * person
total = a + shadow
rgb = (rgb * a[..., None] + 30 * shadow[..., None]) / np.maximum(total, 1e-4)[..., None]
frame = Image.fromarray(np.dstack([rgb, np.clip(total, 0, 1) * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

# 떨어져 나가는 조각: 띠 모양 그대로, 둘레에 흰 속살 (조각 쪽도 찢긴 면이 보이게)
edge = np.zeros((H, W), np.float32)
for d in (d_top, d_bot):
    edge = np.maximum(edge, band(0, np.clip(5 + wobble(20, 4), 2, 10)[None, :], d))
edge *= hole
srgb = arr[..., :3] * (1 - edge[..., None]) + white * edge[..., None]
strip = Image.fromarray(np.dstack([srgb, person * hole * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

frame.save('images/hero/tear-frame.webp', 'WEBP', quality=86, method=6)
strip.save('images/hero/tear-strip.webp', 'WEBP', quality=86, method=6)
assert frame.size == strip.size == src.size
print('ok', src.size)
