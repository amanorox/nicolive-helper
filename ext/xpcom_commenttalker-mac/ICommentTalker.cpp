#include <stdio.h>
#include <stdlib.h>
#include <wchar.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>

#include <nsEmbedString.h>
#include "ICommentTalker.h"

#define MY_COMPONENT_CONTRACTID	"@miku39.jp/NLHCommentTalker;1"
#define MY_COMPONENT_CLASSNAME	"NLH CommentTalker XPCOM"
#define MY_COMPONENT_CID		{ 0x205b68cf, 0xac75, 0x49f7, { 0x8b, 0x2a, 0x39, 0x9d, 0xd6, 0xd5, 0x69, 0x2 } }



int PRUnicharLen(const PRUnichar*uni)
{
	int cnt=0;
	if(uni==NULL) return 0;
	while(*uni){
		*uni++;
		cnt++;
	}
	return cnt;
}


char*unicodetoutf8(const PRUnichar*uni)
{
	int len = PRUnicharLen(uni) + 1;
	char*ret = (char*)malloc( len * 6 );
	char*buf = ret;
	int i;
	for(i=0;i<len;i++,uni++){
		PRUnichar ch = *uni;
		if(ch<=0x7f){
			*buf++ = ch;
		}else if(ch<=0x7ff){
			*buf++ = 0xc0 | ( (ch>>6) & 0x1f );
			*buf++ = 0x80 | ( ch & 0x3f );
		}else{
			*buf++ = 0xe0 | ( (ch>>12) & 0x0f );
			*buf++ = 0x80 | ( (ch>>6 ) & 0x3f );
			*buf++ = 0x80 | (ch & 0x3f );
		}
	}
	*buf = 0;
	return ret;
}


int bouyomichan(const PRUnichar *execpath, const PRUnichar *text)
{	
	sockaddr_in server;
	int      sock;
	
	short  speed = -1, tone = -1, volume = -1, voice = 0;
	long   len;
	char   *msg;
	
	msg = (char*)text;
	len = (long)PRUnicharLen(text)*2;
	
	//送信するデータの生成(文字列を除いた先頭の部分)
	char buf[15];
	*((short*)&buf[0])  = 0x0001; //[0-1]  (16Bit) コマンド          （ 0:メッセージ読み上げ）
	*((short*)&buf[2])  = speed;  //[2-3]  (16Bit) 速度              （-1:棒読みちゃん画面上の設定）
	*((short*)&buf[4])  = tone;   //[4-5]  (16Bit) 音程              （-1:棒読みちゃん画面上の設定）
	*((short*)&buf[6])  = volume; //[6-7]  (16Bit) 音量              （-1:棒読みちゃん画面上の設定）
	*((short*)&buf[8])  = voice;  //[8-9]  (16Bit) 声質              （ 0:棒読みちゃん画面上の設定、1:女性1、2:女性2、3:男性1、4:男性2、5:中性、6:ロボット、7:機械1、8:機械2、2001〜:AquesTalk2、10001〜:SAPI5）
	*((char* )&buf[10]) = 1;      //[10]   ( 8Bit) 文字列の文字コード（ 0:UTF-8, 1:Unicode, 2:Shift-JIS）
	*((long* )&buf[11]) = len;    //[11-14](32Bit) 文字列の長さ(バイト数)
	
	//接続先指定用構造体の準備
	char*ipaddr = unicodetoutf8(execpath);
	server.sin_addr.s_addr = inet_addr(ipaddr);
	server.sin_port        = htons(50001);
	server.sin_family      = AF_INET;
	free(ipaddr);

	if( server.sin_addr.s_addr==INADDR_NONE ) return 0;

	//ソケット作成
	sock = socket(AF_INET, SOCK_STREAM, 0);
	if(sock<0) return 0;
	
	//サーバに接続
	if(connect(sock, (struct sockaddr *)&server, sizeof(server))==0){
		//データ送信
		send(sock, buf, 15, 0);
		send(sock, msg, len, 0);
	}
	
	//ソケット終了
	close(sock);

	return 0;
}


int is_saykotoeri_active()
{
    // /bin/ps aux | /usr/bin/grep "/usr/local/bin/SayKana" | grep -v grep
    const char*exe="/bin/ps aux | /usr/bin/grep -i '/usr/local/bin/SayKana' | grep -v grep";
    FILE*file;
    int flg=0;
    file = popen(exe,"r");
    while(1){
        char buf[512];
        if(fgets(buf,sizeof(buf),file)==NULL) break;
        flg=1;
    }
    pclose(file);
    return flg;
}

int is_saykotoeri2_active()
{
    // /bin/ps aux | /usr/bin/grep "/usr/local/bin/SayKana" | grep -v grep
    const char*exe="/bin/ps aux | /usr/bin/grep -i '/usr/local/bin/SayKotoeri2' | grep -v grep";
    FILE*file;
    int flg=0;
    file = popen(exe,"r");
    while(1){
        char buf[512];
        if(fgets(buf,sizeof(buf),file)==NULL) break;
        flg=1;
    }
    pclose(file);
    return flg;
}


int saykotoeri(const PRUnichar *text)
{
    if( is_saykotoeri_active() ) return 0;
	char*utf8str = unicodetoutf8(text);	
	char buf[8192];
	sprintf(buf,"/usr/local/bin/saykotoeri \"%s\" & ",utf8str);
	system(buf);
	free(utf8str);
	return 1;
}

int saykotoeri2(const PRUnichar*option, const PRUnichar *text)
{
    if( is_saykotoeri2_active() ) return 0;
	char*utf8str = unicodetoutf8(text);
	char*opt = unicodetoutf8(option);
	char buf[8192];
	sprintf(buf,"/usr/local/bin/SayKotoeri2 %s \"%s\" & ", opt, utf8str);
	system(buf);
	free(utf8str);
	free(opt);
	return 1;
}



/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class NLHCommentTalker : public INLHCommentTalker
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_INLHCOMMENTTALKER

  NLHCommentTalker();

private:
  ~NLHCommentTalker();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(NLHCommentTalker, INLHCommentTalker)

NLHCommentTalker::NLHCommentTalker()
{
  /* member initializers and constructor code */
}

NLHCommentTalker::~NLHCommentTalker()
{
  /* destructor code */
}

/* long Add (in long nData1, in long nData2); */
NS_IMETHODIMP NLHCommentTalker::Add(PRInt32 nData1, PRInt32 nData2, PRInt32 *_retval NS_OUTPARAM)
{
	*_retval = nData1 + nData2;
    return NS_OK;
}

/* long callTalkerProgram (in wstring execPath, in wstring strData); */
NS_IMETHODIMP NLHCommentTalker::CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	// IDLを再構築するのは面倒なので、空いている関数をSayKotoeri2に流用.
	*_retval = saykotoeri2(execPath,strData);
    return NS_OK;
}

/* long sayBouyomichan (in wstring server, in wstring strData); */
NS_IMETHODIMP NLHCommentTalker::SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	bouyomichan(server,strData);
	*_retval = 0;	
    return NS_OK;
}

/* long sayKotoeri (in wstring strData); */
NS_IMETHODIMP NLHCommentTalker::SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	*_retval = saykotoeri(strData);
    return NS_OK;
}

/* End of implementation class template. */


#include "nsIGenericFactory.h"


NS_GENERIC_FACTORY_CONSTRUCTOR(NLHCommentTalker)

static nsModuleComponentInfo components[] =
{
	{
		MY_COMPONENT_CLASSNAME, 
		MY_COMPONENT_CID,
		MY_COMPONENT_CONTRACTID,
		NLHCommentTalkerConstructor,
	}
};

NS_IMPL_NSGETMODULE(NLHCommentTalkerModule, components) 

