// cookiereader_dll.cpp : DLL アプリケーション用にエクスポートされる関数を定義します。
//
#include "stdafx.h"
#include <windows.h>
#include <WinCrypt.h>
#include <wininet.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sqlite3/sqlite3.h"


#ifdef __cplusplus
extern "C"{
#endif

	HRESULT __declspec(dllexport) GetProtectedModeIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len);
	HRESULT __declspec(dllexport) GetIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len);
	HRESULT __declspec(dllexport) GetGoogleChromeCookie(LPCSTR db_path, LPSTR cookie, DWORD len);

#ifdef __cplusplus
};
#endif

#pragma comment(lib,"wininet.lib")
#pragma comment (lib, "crypt32.lib")

typedef HRESULT (__stdcall *IEGetProtectedModeCookie__)(LPCWSTR,LPCWSTR,LPWSTR,DWORD*,DWORD);

HRESULT __declspec(dllexport) GetProtectedModeIECookie(LPCWSTR url, LPCWSTR name, LPWSTR cookie, DWORD len)
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

HRESULT __declspec(dllexport) GetIECookie(LPCWSTR url, LPCWSTR name, LPWSTR cookie, DWORD len)
{
	if( InternetGetCookieW( url, name, cookie, &len ) ){
		return S_OK;
	}
	return E_FAIL;
}


HRESULT __declspec(dllexport) GetGoogleChromeCookie(LPCSTR db_path, LPSTR cookie, DWORD len)
{
	int r;
	sqlite3 *db;

	ZeroMemory( cookie, len );

	// "C:\\Users\\amano\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cookies"
	r = sqlite3_open( db_path, &db );
	if( r != SQLITE_OK ) return E_FAIL;

	sqlite3_stmt *stmt;
	char *query = "SELECT * FROM cookies WHERE host_key like \"%.nicovideo.jp%\" AND name=\"user_session\";";
	r = sqlite3_prepare( db, query, strlen(query), &stmt, NULL );
	if( r != SQLITE_OK ){
		sqlite3_close( db );
		return E_FAIL;
	}

	while( 1 ){
		r = sqlite3_step( stmt );
		if( r==SQLITE_DONE ){
			break;
		}else if( r!=SQLITE_ROW ){
			break;
		}else{
			//printf("sqlite3_step = %d\n", r);
		}

		const char* blob = (const char*)sqlite3_column_blob( stmt, 12 );
		int sz = sqlite3_column_bytes( stmt, 12 );

		DATA_BLOB in;
		DATA_BLOB out;
		in.cbData = sz;
		in.pbData = (BYTE*)blob;

		if( CryptUnprotectData(&in, NULL, NULL, NULL, NULL, 0, &out)!=TRUE ){
			sqlite3_finalize( stmt );
			sqlite3_close( db );
			return E_FAIL;
		}

		memcpy( cookie, out.pbData, (len<out.cbData ? len : out.cbData+1)-1 );
		LocalFree( out.pbData );
	}

	if( r != SQLITE_DONE ){
		sqlite3_finalize( stmt );
		sqlite3_close( db );
		return E_FAIL;
	}

	sqlite3_finalize( stmt );
	sqlite3_close( db );

	return S_OK;
}
