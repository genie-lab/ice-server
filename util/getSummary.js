const getSummary = (content, len=297)=>{
  //태그를 제거
  let text = content.replace(/\r|\n|&nbsp;|(<([^>]+)>)/ig,"");
  // let text = content.replace(/(<([^>]+)>)/ig,"");
  if(text.length > len){
    text = text.substr(0,len)+"...";
  }
  return text;
}

module.exports = getSummary;