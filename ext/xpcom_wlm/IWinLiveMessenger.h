/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM d:\sources\firefox\xpcom_wlm\IWinLiveMessenger.idl
 */

#ifndef __gen_IWinLiveMessenger_h__
#define __gen_IWinLiveMessenger_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    IWinLiveMessenger */
#define IWINLIVEMESSENGER_IID_STR "a31af9d7-9e47-4ca8-834a-7743f3879bec"

#define IWINLIVEMESSENGER_IID \
  {0xa31af9d7, 0x9e47, 0x4ca8, \
    { 0x83, 0x4a, 0x77, 0x43, 0xf3, 0x87, 0x9b, 0xec }}

class NS_NO_VTABLE NS_SCRIPTABLE IWinLiveMessenger : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(IWINLIVEMESSENGER_IID)

  /* long SetWinLiveMessengerMsg (in wstring strData); */
  NS_SCRIPTABLE NS_IMETHOD SetWinLiveMessengerMsg(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(IWinLiveMessenger, IWINLIVEMESSENGER_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_IWINLIVEMESSENGER \
  NS_SCRIPTABLE NS_IMETHOD SetWinLiveMessengerMsg(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_IWINLIVEMESSENGER(_to) \
  NS_SCRIPTABLE NS_IMETHOD SetWinLiveMessengerMsg(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return _to SetWinLiveMessengerMsg(strData, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_IWINLIVEMESSENGER(_to) \
  NS_SCRIPTABLE NS_IMETHOD SetWinLiveMessengerMsg(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->SetWinLiveMessengerMsg(strData, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public IWinLiveMessenger
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IWINLIVEMESSENGER

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, IWinLiveMessenger)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* long SetWinLiveMessengerMsg (in wstring strData); */
NS_IMETHODIMP _MYCLASS_::SetWinLiveMessengerMsg(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_IWinLiveMessenger_h__ */
