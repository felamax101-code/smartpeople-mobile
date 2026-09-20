
//Truncating body text

const  truncate=(text:string,max:number=100):string=>{
  if (text.length<=max) return text;
  const sliced=text.slice(0,max);
  return sliced.slice(0,sliced.lastIndexOf(""))+("...")
}

export default truncate