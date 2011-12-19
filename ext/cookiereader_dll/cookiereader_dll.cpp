// cookiereader_dll.cpp : DLL アプリケーション用にエクスポートされる関数を定義します。
//
#include "stdafx.h"
#include <windows.h>
#include <wininet.h>


#ifdef __cplusplus
extern "C"{
#endif

	HRESULT __declspec(dllexport) GetProtectedModeIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len);
	HRESULT __declspec(dllexport) GetIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len);

#ifdef __cplusplus
};
#endif


#pragma comment(lib,"wininet.lib")

typedef HRESULT (__stdcall *IEGetProtectedModeCookie__)(LPCWSTR,LPCWSTR,LPWSTR,DWORD*,DWORD);

#define LEN_COOKIE  8192
WCHAR g_cookie[LEN_COOKIE];

HRESULT __declspec(dllexport) GetProtectedModeIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len)
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

HRESULT __declspec(dllexport) GetIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len)
{
	if( InternetGetCookieW( url, name, cookie, &len ) ){
		return S_OK;
	}
	return E_FAIL;
}
