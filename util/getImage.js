// 이미지 url 만들기
function getImage(config, item) {
  const { bo_table: table, bo_thumb_width: w, bo_thumb_height: h } = config;
  const url = `/upload/${table}`;
  const imgPattern = /<img[^>]*src=[\"']?([^>\"']+)[\"']?[^>]*>/;
  const match = item.wr_content.match(imgPattern);

  // 본문에 들어가는 이미지 있으면
  if (match) {
    // 외부 링크 연결이면
    if (match[1].startsWith("/upload")) {
      return match[1] + `?w=${w}&h=${h}`;
    }
    return match[1];
  }

  // 첨부파일에 이미지가 있으면
  if (item.wrFiles.length > 0) {
    const img = item.wrFiles.find((f) => {
      return f.bf_type.startsWith("image/");
    });

    if (img) {
      return `${url}/${img.bf_src}?w=${w}&h=${h}`;
    }
  }

  return null;
}

module.exports = getImage;
