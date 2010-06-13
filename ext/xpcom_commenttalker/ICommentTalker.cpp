#include <windows.h>
#include <wchar.h>
#include "nsEmbedString.h"
#include "ICommentTalker.h"

#pragma comment(lib,"nspr4.lib")
#pragma comment(lib,"xpcomglue_s.lib")
#pragma comment(lib,"xpcomglue.lib")
#pragma comment(lib,"xpcom.lib")

#pragma comment(lib,"ws2_32.lib")

#define MY_COMPONENT_CONTRACTID	"@miku39.jp/NLHCommentTalker;1"
#define MY_COMPONENT_CLASSNAME	"NLH CommentTalker XPCOM"
#define MY_COMPONENT_CID		{ 0x205b68cf, 0xac75, 0x49f7, { 0x8b, 0x2a, 0x39, 0x9d, 0xd6, 0xd5, 0x69, 0x2 } }

bool isExistBouyomiChan()
{
	HANDLE mutex;
	bool b = false;

	mutex = CreateMutex(NULL,TRUE,L"�_�ǂ݂����");
	if(mutex && GetLastError()==ERROR_ALREADY_EXISTS){
		b = true;
	}
	ReleaseMutex(mutex);
	CloseHandle(mutex);

	mutex = CreateMutex(NULL,TRUE,L"BouyomiChan");
	if(mutex && GetLastError()==ERROR_ALREADY_EXISTS){
		b = true;
	}
	ReleaseMutex(mutex);
	CloseHandle(mutex);
	return b;
}

int bouyomichan(const WCHAR*execpath, const WCHAR *text)
{
	if( !isExistBouyomiChan() ) return 0;

	sockaddr_in server;
	SOCKET      sock;
	
	short  speed = -1, tone = -1, volume = -1, voice = 0;
	long   len;
	char   *msg;

	msg = (char*)text;
	len = (long)wcslen((WCHAR*)msg)*2;

	//���M����f�[�^�̐���(��������������擪�̕���)
	char buf[15];
	*((short*)&buf[0])  = 0x0001; //[0-1]  (16Bit) �R�}���h          �i 0:���b�Z�[�W�ǂݏグ�j
	*((short*)&buf[2])  = speed;  //[2-3]  (16Bit) ���x              �i-1:�_�ǂ݂�����ʏ�̐ݒ�j
	*((short*)&buf[4])  = tone;   //[4-5]  (16Bit) ����              �i-1:�_�ǂ݂�����ʏ�̐ݒ�j
	*((short*)&buf[6])  = volume; //[6-7]  (16Bit) ����              �i-1:�_�ǂ݂�����ʏ�̐ݒ�j
	*((short*)&buf[8])  = voice;  //[8-9]  (16Bit) ����              �i 0:�_�ǂ݂�����ʏ�̐ݒ�A1:����1�A2:����2�A3:�j��1�A4:�j��2�A5:�����A6:���{�b�g�A7:�@�B1�A8:�@�B2�A2001�`:AquesTalk2�A10001�`:SAPI5�j
	*((char* )&buf[10]) = 1;      //[10]   ( 8Bit) ������̕����R�[�h�i 0:UTF-8, 1:Unicode, 2:Shift-JIS�j
	*((long* )&buf[11]) = len;    //[11-14](32Bit) ������̒���(�o�C�g��)
	
	//�ڑ���w��p�\���̂̏���
	server.sin_addr.s_addr = inet_addr("127.0.0.1");
	server.sin_port        = htons(50001);
	server.sin_family      = AF_INET;

	//�\�P�b�g�쐬
	sock = socket(AF_INET, SOCK_STREAM, 0);
	if(sock==INVALID_SOCKET) return 0;

	//�T�[�o�ɐڑ�
	if(connect(sock, (struct sockaddr *)&server, sizeof(server))==0){
		//�f�[�^���M
		send(sock, buf, 15, 0);
		send(sock, msg, len, 0);
	}

	//�\�P�b�g�I��
	closesocket(sock);

	return 0;
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
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* long callTalkerProgram (in wstring execPath, in wstring strData); */
NS_IMETHODIMP NLHCommentTalker::CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	bouyomichan(execPath, strData);
	return NS_OK;
}

/* long sayBouyomichan (in wstring server, in wstring strData); */
NS_IMETHODIMP NLHCommentTalker::SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	bouyomichan(server, strData);
	*_retval = 0;
    return NS_OK;
}

/* long sayKotoeri (in wstring strData); */
NS_IMETHODIMP NLHCommentTalker::SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
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



#ifdef _MANAGED
#pragma managed(push, off)
#endif

BOOL APIENTRY DllMain( HMODULE hModule, DWORD  ul_reason_for_call, LPVOID lpReserved )
{
    return TRUE;
}

#ifdef _MANAGED
#pragma managed(pop)
#endif
