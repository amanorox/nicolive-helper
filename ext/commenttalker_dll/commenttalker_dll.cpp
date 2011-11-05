// commenttalker_dll.cpp : DLL �A�v���P�[�V�����p�ɃG�N�X�|�[�g�����֐����`���܂��B
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
