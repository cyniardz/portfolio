"""영상 모드 MAKE VIDEO 채우기용 흑연 질감: 히어로 그림처럼 비스듬한 연필 선을 겹겹이 그어 만든 회흑색 면.
결과 images/hero/make-graphite.webp (왼쪽 절반 투명 | 오른쪽 절반 흑연 질감, 경계는 연필로 칠한 듯 들쭉날쭉)
→ style.css가 이 이미지를 글자 모양으로 잘라 옆으로 밀어서 B → M 방향으로 칠해지게 함
실행: uv run --with pillow --with numpy python images/hero/make-graphite.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H, S = 1200, 200, 2          # 2배로 그린 뒤 줄여 선을 부드럽게
rng = np.random.default_rng(5)
img = Image.new('L', (W * S, H * S), 92)                       # 바탕: 목탄 회흑색
d = ImageDraw.Draw(img)
for _ in range(9000):                                           # 비스듬한 연필 선 (그림 속 스웨터 결 방향)
    x, y = rng.uniform(-60, W * S), rng.uniform(-40, H * S)
    ln = rng.uniform(25, 90); ang = np.radians(rng.normal(-62, 8))
    tone = int(np.clip(rng.normal(70, 28), 15, 170))
    d.line((x, y, x + ln * np.cos(ang), y - ln * np.sin(ang)), fill=tone, width=int(rng.integers(1, 4)))
img = img.filter(ImageFilter.GaussianBlur(0.8)).resize((W, H), Image.LANCZOS)
tex = np.asarray(img, np.float32)
tex += rng.normal(0, 7, tex.shape)                              # 종이 결 알갱이

y = np.arange(H)[:, None]; x = np.arange(W * 2)[None, :]
# 칠한 끝: 줄마다 길이가 다른 연필 스트로크. 다 칠했을 때 글자 왼쪽 끝까지 꽉 차도록 가운데보다 살짝 왼쪽에 둠
edge = W - 130 + y * 0.3 + np.repeat(rng.uniform(0, 60, H // 3 + 1), 3)[:H, None]
alpha = np.clip((x - edge) / 20, 0, 1)
tex2 = np.concatenate([tex, tex], axis=1)
full = np.dstack([tex2, tex2, tex2 * 0.98, alpha * 255])
Image.fromarray(full.clip(0, 255).astype(np.uint8), 'RGBA').save('images/hero/make-graphite.webp', 'WEBP', quality=82, method=6)
print('ok')
