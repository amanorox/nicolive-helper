#include <windows.h>
#include <wininet.h>
#include "nsXPCOM.h"
#include "nsEmbedString.h"
#include "INLHGetCookie.h"

#pragma comment(lib,"nspr4.lib")
#pragma comment(lib,"xpcomglue_s_nomozalloc.lib")
//#pragma comment(lib,"xpcomglue.lib")
#pragma comment(lib,"xpcom.lib")

#pragma comment(lib,"wininet.lib")

#define MY_COMPONENT_CONTRACTID	"@miku39.jp/NLHGetCookie;1"
#define MY_COMPONENT_CLASSNAME	"NLH Cookie Reader XPCOM"
#define MY_COMPONENT_CID		{ 0x952aeb1, 0xebd1, 0x4c8d, { 0x84, 0x40, 0x89, 0x41, 0xab, 0xeb, 0xc8, 0x61 } }

typedef HRESULT (__stdcall *IEGetProtectedModeCookie__)(LPCWSTR,LPCWSTR,LPWSTR,DWORD*,DWORD);

#define LEN_COOKIE  8192
WCHAR g_cookie[LEN_COOKIE];

HRESULT GetProtectedModeIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len)
{
	HMODULE mod = LoadLibrary(L"ieframe.dll");
	if( !mod ) return E_FAIL;
	IEGetProtectedModeCookie__ f2 = (IEGetProtectedModeCookie__)GetProcAddress( mod, "IEGetProtectedModeCookie" );
	HRESULT hr = E_FAIL;
	hr = f2( url, name, cookie, &len, NULL);
	FreeLibrary(mod);
	if (hr != S_OK){
		hr = HRESULT_FROM_WIN32(GetLastError());
		return E_FAIL;
	}
	return S_OK;
}

HRESULT GetIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len)
{
	if( InternetGetCookieW( url, name, cookie, &len ) ){
		return S_OK;
	}
	return E_FAIL;
}



/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class NLHGetCookie : public INLHGetCookie
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_INLHGETCOOKIE

  NLHGetCookie();

private:
  ~NLHGetCookie();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(NLHGetCookie, INLHGetCookie)

NLHGetCookie::NLHGetCookie()
{
  /* member initializers and constructor code */
}

NLHGetCookie::~NLHGetCookie()
{
  /* destructor code */
}

/* wstring getProtectedModeIECookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetProtectedModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
	ZeroMemory( g_cookie, sizeof(g_cookie) );
	if( ::GetProtectedModeIECookie( path, name, g_cookie, LEN_COOKIE-1 )==S_OK ){
		//OutputDebugStringW(g_cookie);
		*_retval = (PRUnichar*)NS_Alloc(LEN_COOKIE*sizeof(PRUnichar));
		if( *_retval == NULL ){
			return NS_ERROR_FAILURE;
		}
		wcscpy(*_retval, g_cookie);
    }else{
        return NS_ERROR_FAILURE;
    }
    return NS_OK;
}

/* wstring getStandardModeIECookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetStandardModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
	ZeroMemory( g_cookie, sizeof(g_cookie) );
	if( ::GetIECookie( path, name, g_cookie, LEN_COOKIE-1 )==S_OK ){
		//OutputDebugStringW(g_cookie);
		*_retval = (PRUnichar*)NS_Alloc(LEN_COOKIE*sizeof(PRUnichar));
		if( *_retval == NULL ){
			return NS_ERROR_FAILURE;
		}
		wcscpy(*_retval, g_cookie);
    }else{
        return NS_ERROR_FAILURE;
    }
    return NS_OK;
}

/* wstring getMacSafariCookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetMacSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getWinSafariCookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetWinSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getWinChromeCookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetWinChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getMacChromeCookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetMacChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getLinuxChromeCookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetLinuxChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getOperaCookie (in wstring path, in wstring name); */
NS_IMETHODIMP NLHGetCookie::GetOperaCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */


#include "mozilla/ModuleUtils.h"
#include "nsIClassInfoImpl.h"


NS_GENERIC_FACTORY_CONSTRUCTOR(NLHGetCookie)

NS_DEFINE_NAMED_CID(MY_COMPONENT_CID);

static const mozilla::Module::CIDEntry kNLHGetCookieCIDs[] = {
    { &kMY_COMPONENT_CID, false, NULL, NLHGetCookieConstructor },
    { NULL }
};

static const mozilla::Module::ContractIDEntry kNLHGetCookieContracts[] = {
    { MY_COMPONENT_CONTRACTID, &kMY_COMPONENT_CID },
    { NULL }
};

static const mozilla::Module::CategoryEntry kNLHGetCookieCategories[] = {
    { "my-nlh-category", "my-nlh-key", MY_COMPONENT_CONTRACTID },
    { NULL }
};

static const mozilla::Module kNLHGetCookieModule = {
    mozilla::Module::kVersion,
    kNLHGetCookieCIDs,
    kNLHGetCookieContracts,
    kNLHGetCookieCategories
};

NSMODULE_DEFN(NLHGetCookieModule) = &kNLHGetCookieModule;
NS_IMPL_MOZILLA192_NSGETMODULE(&kNLHGetCookieModule)
