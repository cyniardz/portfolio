"""굵은 타자기 글꼴(TypeBold: MAKE WEB, Skill 제목)을 쓰는 글자만 남겨 작게 만든다.
한글이 필요해지면 아래 KO에 글자를 넣고 다시 실행.

원본: https://github.com/google/fonts/raw/main/ofl/nanumgothiccoding/NanumGothicCoding-Bold.ttf
실행 (프로젝트 폴더에서):
  uv run --with fonttools --with brotli python fonts/subset-type.py <원본.ttf>
"""
import sys
from fontTools import subset

KO = ''
text = ''.join(chr(c) for c in range(0x20, 0x7F)) + KO

opts = subset.Options()
opts.flavor = 'woff2'
font = subset.load_font(sys.argv[1], opts)
sub = subset.Subsetter(opts)
sub.populate(text=text)
sub.subset(font)
subset.save_font(font, 'fonts/NanumGothicCoding-Bold.type.woff2', opts)
print('글자 수:', len(set(text)))
