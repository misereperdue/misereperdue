// Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) for screenshot pixel checks in tests.
const zlib=require('zlib');
exports.PNG=function(buf){let p=8,w,h,type,idat=[];while(p<buf.length){const len=buf.readUInt32BE(p),t=buf.toString('ascii',p+4,p+8),d=buf.subarray(p+8,p+8+len);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);type=d[9];if(d[8]!==8||d[12])throw new Error('unsupported png');}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;p+=12+len;}
 const bpp=type===6?4:type===2?3:0;if(!bpp)throw new Error('unsupported png type');const raw=zlib.inflateSync(Buffer.concat(idat)),stride=w*bpp,out=Buffer.alloc(w*h*4),prev=Buffer.alloc(stride),cur=Buffer.alloc(stride);
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)];raw.copy(cur,0,y*(stride+1)+1,(y+1)*(stride+1));for(let x=0;x<stride;x++){const a=x>=bpp?cur[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=cur[x];if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}cur[x]=v&255;}
  for(let x=0;x<w;x++){out[(y*w+x)*4]=cur[x*bpp];out[(y*w+x)*4+1]=cur[x*bpp+1];out[(y*w+x)*4+2]=cur[x*bpp+2];out[(y*w+x)*4+3]=bpp===4?cur[x*bpp+3]:255;}cur.copy(prev);}
 return{width:w,height:h,data:out};};
