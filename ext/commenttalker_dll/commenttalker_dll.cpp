// commenttalker_dll.cpp : DLL アプリケーション用にエクスポートされる関数を定義します。
//

#include "stdafx.h"

#include <winsock2.h>
#include <windows.h>

#include "commenttalker_dll.h"

#pragma comment(lib,"ws2_32.lib")

bool isExistBouyomiChan()
{
	HANDLE mutex;
	bool b = false;

	mutex = CreateMutex(NULL,TRUE,L"棒読みちゃん");
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

int __declspec(dllexport) bouyomichan(const WCHAR*execpath, const WCHAR *text)
{
	if( !isExistBouyomiChan() ) return 0;

	sockaddr_in server;
	SOCKET      sock;
	
	short  speed = -1, tone = -1, volume = -1, voice = 0;
	long   len;
	char   *msg;

	msg = (char*)text;
	len = (long)wcslen((WCHAR*)msg)*2;

	//送信するデータの生成(文字列を除いた先頭の部分)
	char buf[15];
	*((short*)&buf[0])  = 0x0001; //[0-1]  (16Bit) コマンド          （ 0:メッセージ読み上げ）
	*((short*)&buf[2])  = speed;  //[2-3]  (16Bit) 速度              （-1:棒読みちゃん画面上の設定）
	*((short*)&buf[4])  = tone;   //[4-5]  (16Bit) 音程              （-1:棒読みちゃん画面上の設定）
	*((short*)&buf[6])  = volume; //[6-7]  (16Bit) 音量              （-1:棒読みちゃん画面上の設定）
	*((short*)&buf[8])  = voice;  //[8-9]  (16Bit) 声質              （ 0:棒読みちゃん画面上の設定、1:女性1、2:女性2、3:男性1、4:男性2、5:中性、6:ロボット、7:機械1、8:機械2、2001～:AquesTalk2、10001～:SAPI5）
	*((char* )&buf[10]) = 1;      //[10]   ( 8Bit) 文字列の文字コード（ 0:UTF-8, 1:Unicode, 2:Shift-JIS）
	*((long* )&buf[11]) = len;    //[11-14](32Bit) 文字列の長さ(バイト数)
	
	//接続先指定用構造体の準備
	server.sin_addr.s_addr = inet_addr("127.0.0.1");
	server.sin_port        = htons(50001);
	server.sin_family      = AF_INET;

	//ソケット作成
	sock = socket(AF_INET, SOCK_STREAM, 0);
	if(sock==INVALID_SOCKET) return 0;

	//サーバに接続
	if(connect(sock, (struct sockaddr *)&server, sizeof(server))==0){
		//データ送信
		send(sock, buf, 15, 0);
		send(sock, msg, len, 0);
	}

	//ソケット終了
	closesocket(sock);

	return 0;
}
