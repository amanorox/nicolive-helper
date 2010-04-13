#include <windows.h>
#include <wchar.h>
#include "nsEmbedString.h"
#include "IWinLiveMessenger.h"

#pragma comment(lib,"nspr4.lib")
#pragma comment(lib,"xpcomglue_s.lib")
#pragma comment(lib,"xpcomglue.lib")
#pragma comment(lib,"xpcom.lib")


#import "Skype4COM.dll"


#define MY_COMPONENT_CONTRACTID	"@miku39.jp/WinLiveMessenger;1"
#define MY_COMPONENT_CLASSNAME	"WinLiveMessenger XPCOM"
#define MY_COMPONENT_CID		{ 0x8aaeebfd, 0xb6ec, 0x46f0, { 0x9c, 0x3c, 0xe7, 0xea, 0xca, 0xf,  0x90, 0xc  } }


static int ChangeWindowsLiveMessengerPresence(const WCHAR*str)
{
	HWND hwnd = FindWindowW(L"MsnMsgrUIManager",NULL);
	if(hwnd==NULL){
		return -1;
	}

	WCHAR buf[8192];
	::ZeroMemory(buf,sizeof(buf));
	_snwprintf_s(buf, 8192, _TRUNCATE, L"NLHelper\\0Music\\01\\0{0}\\0%s\\0\\0\\0",str);

	COPYDATASTRUCT data;
    data.dwData = 1351;
    data.cbData = wcslen(buf)*2+2;
    data.lpData = buf;

	::SendMessageW(hwnd,WM_COPYDATA,NULL,(LPARAM)&data);
	return 0;
}

static void ChangeSkypeMoodText(const WCHAR*str)
{
	// Create Skype object
	SKYPE4COMLib::ISkypePtr pSkype(__uuidof(SKYPE4COMLib::Skype));
	SKYPE4COMLib::ICommandPtr pCmd(__uuidof(SKYPE4COMLib::Command));

	// Connect to API
	HRESULT hr = pSkype->Attach(6,VARIANT_TRUE);
	if( FAILED(hr) ) goto cleanup;
	//printf("%d\n",hr);

	pCmd->PutId(0);
	WCHAR wbuf[8192];
	wsprintf(wbuf,L"SET PROFILE RICH_MOOD_TEXT %s",str);
	//BSTR str = L"SET PROFILE RICH_MOOD_TEXT ƒeƒXƒg.";
	pCmd->put_Command(wbuf);
	pSkype->SendCommand( pCmd );

cleanup:
	// Cleanup
	//pCmd->Release();
	//pSkype->Release();
	pCmd = NULL;
	pSkype = NULL;
}


/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class WinLiveMessenger : public IWinLiveMessenger
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IWINLIVEMESSENGER

  WinLiveMessenger();

private:
  ~WinLiveMessenger();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(WinLiveMessenger, IWinLiveMessenger)

WinLiveMessenger::WinLiveMessenger()
{
  /* member initializers and constructor code */
}

WinLiveMessenger::~WinLiveMessenger()
{
  /* destructor code */
}

/* long SetWinLiveMessengerMsg (in wstring strData); */
NS_IMETHODIMP WinLiveMessenger::SetWinLiveMessengerMsg(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	//ChangeWindowsLiveMessengerPresence(L"From Firefox");
	ChangeWindowsLiveMessengerPresence( strData );
	*_retval = 0;
    return NS_OK;
}

/* long SetSkypeMoodText (in wstring strData); */
NS_IMETHODIMP WinLiveMessenger::SetSkypeMoodText(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
	ChangeSkypeMoodText(strData);
	*_retval = 0;
    return NS_OK;
}


/* End of implementation class template. */


#include "nsIGenericFactory.h"


NS_GENERIC_FACTORY_CONSTRUCTOR(WinLiveMessenger)

static nsModuleComponentInfo components[] =
{
	{
		MY_COMPONENT_CLASSNAME, 
		MY_COMPONENT_CID,
		MY_COMPONENT_CONTRACTID,
		WinLiveMessengerConstructor,
	}
};

NS_IMPL_NSGETMODULE(WinLiveMessengerModule, components) 



#ifdef _MANAGED
#pragma managed(push, off)
#endif

BOOL APIENTRY DllMain( HMODULE hModule,
                       DWORD  ul_reason_for_call,
                       LPVOID lpReserved
					 )
{
    return TRUE;
}

#ifdef _MANAGED
#pragma managed(pop)
#endif
