"""작업물 섹션 글꼴(나눔고딕코딩)을 projects.json에 쓰인 글자만 남겨 작게 만든다.
projects.json의 글을 바꾸면 다시 실행해야 새 글자가 이 글꼴로 나온다.

원본: https://github.com/google/fonts/raw/main/ofl/nanumgothiccoding/NanumGothicCoding-Regular.ttf
실행 (프로젝트 폴더에서):
  uv run --with fonttools --with brotli python fonts/subset-works.py <원본.ttf>
"""
import sys
from fontTools import subset

src = sys.argv[1]
text = ''.join(chr(c) for c in range(0x20, 0x7F))          # 영문·숫자·기호 (문자 효과에 쓰임)
text += '·–—’‘“”…→←'
text += open('data/projects.json', encoding='utf-8').read()

opts = subset.Options()
opts.flavor = 'woff2'
font = subset.load_font(src, opts)
sub = subset.Subsetter(opts)
sub.populate(text=text)
sub.subset(font)
subset.save_font(font, 'fonts/NanumGothicCoding-Regular.works.woff2', opts)
print('글자 수:', len(set(text)))
