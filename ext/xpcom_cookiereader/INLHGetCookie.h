/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM d:\sources\firefox\xpcom_cookiereader\INLHGetCookie.idl
 */

#ifndef __gen_INLHGetCookie_h__
#define __gen_INLHGetCookie_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    INLHGetCookie */
#define INLHGETCOOKIE_IID_STR "3e6c402f-bb88-40e3-8383-f8eee2f072df"

#define INLHGETCOOKIE_IID \
  {0x3e6c402f, 0xbb88, 0x40e3, \
    { 0x83, 0x83, 0xf8, 0xee, 0xe2, 0xf0, 0x72, 0xdf }}

class NS_NO_VTABLE NS_SCRIPTABLE INLHGetCookie : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(INLHGETCOOKIE_IID)

  /* wstring getProtectedModeIECookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetProtectedModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getStandardModeIECookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetStandardModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getMacSafariCookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetMacSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getWinSafariCookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetWinSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getWinChromeCookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetWinChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getMacChromeCookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetMacChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getLinuxChromeCookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetLinuxChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

  /* wstring getOperaCookie (in wstring path, in wstring name); */
  NS_SCRIPTABLE NS_IMETHOD GetOperaCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(INLHGetCookie, INLHGETCOOKIE_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_INLHGETCOOKIE \
  NS_SCRIPTABLE NS_IMETHOD GetProtectedModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetStandardModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetMacSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetWinSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetWinChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetMacChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetLinuxChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD GetOperaCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_INLHGETCOOKIE(_to) \
  NS_SCRIPTABLE NS_IMETHOD GetProtectedModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetProtectedModeIECookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetStandardModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetStandardModeIECookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetMacSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetMacSafariCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetWinSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetWinSafariCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetWinChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetWinChromeCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetMacChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetMacChromeCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetLinuxChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetLinuxChromeCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetOperaCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return _to GetOperaCookie(path, name, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_INLHGETCOOKIE(_to) \
  NS_SCRIPTABLE NS_IMETHOD GetProtectedModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetProtectedModeIECookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetStandardModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetStandardModeIECookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetMacSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetMacSafariCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetWinSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetWinSafariCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetWinChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetWinChromeCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetMacChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetMacChromeCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetLinuxChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetLinuxChromeCookie(path, name, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD GetOperaCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetOperaCookie(path, name, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public INLHGetCookie
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_INLHGETCOOKIE

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, INLHGetCookie)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* wstring getProtectedModeIECookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetProtectedModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getStandardModeIECookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetStandardModeIECookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getMacSafariCookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetMacSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getWinSafariCookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetWinSafariCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getWinChromeCookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetWinChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getMacChromeCookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetMacChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getLinuxChromeCookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetLinuxChromeCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* wstring getOperaCookie (in wstring path, in wstring name); */
NS_IMETHODIMP _MYCLASS_::GetOperaCookie(const PRUnichar *path, const PRUnichar *name, PRUnichar **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_INLHGetCookie_h__ */
