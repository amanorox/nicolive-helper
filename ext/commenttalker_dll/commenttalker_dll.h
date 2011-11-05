#ifndef COMMENTTALKER_H_DEF
#define COMMENTTALKER_H_DEF

#include <windows.h>

#ifdef __cplusplus
extern "C"{
#endif

	int __declspec(dllexport) bouyomichan(const WCHAR*execpath, const WCHAR *text);

#ifdef __cplusplus
};
#endif


#endif
