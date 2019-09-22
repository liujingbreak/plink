> https://tools.ietf.org/html/rfc1730

## 4. Data Formats
IMAP4 uses textual commands and responses.  Data in IMAP4 can be in
   one of several forms: atom, number, string, parenthesized list, or
   NIL.


### 4.1.    Atom

   An atom consists of one or more non-special characters.


### 4.2.    Number

   A number consists of one or more digit characters, and represents a
   numeric value.


### 4.3.    String

   A string is in one of two forms: literal and quoted string.  The
   literal form is the general form of string.  The quoted string form
   is an alternative that avoids the overhead of processing a literal at
   the cost of restrictions of what may be in a quoted string.

   A literal is a sequence of zero or more octets (including CR and LF),
   prefix-quoted with an octet count in the form of an open brace ("{"),
   the number of octets, close brace ("}"), and CRLF.  In the case of
   literals transmitted from server to client, the CRLF is immediately
   followed by the octet data.  In the case of literals transmitted from
   client to server, the client must wait to receive a command
   continuation request (described later in this document) before
   sending the octet data (and the remainder of the command).

   A quoted string is a sequence of zero or more 7-bit characters,
   excluding CR and LF, with double quote (<">) characters at each end.

   The empty string is respresented as either "" (a quoted string with
   zero characters between double quotes) or as {0} followed by CRLF (a
   literal with an octet count of 0).

        Note: Even if the octet count is 0, a client transmitting a
        literal must wait to receive a command continuation
        request.

### 4.3.1.  8-bit and Binary Strings

   8-bit textual and binary mail is supported through the use of
   [MIME-1] encoding.  IMAP4 implementations MAY transmit 8-bit or
   multi-octet characters in literals, but should do so only when the
   character set is identified.

   Although a BINARY body encoding is defined, unencoded binary strings
   are not permitted.  A "binary string" is any string with NUL
   characters.  Implementations MUST encode binary data into a textual
   form such as BASE64 before transmitting the data.  A string with an
   excessive amount of CTL characters may also be considered to be
   binary, although this is not required.


### 4.4.    Parenthesized List

   Data structures are represented as a "parenthesized list"; a sequence
   of data items, delimited by space, and bounded at each end by
   parentheses.  A parenthesized list may itself contain other
   parenthesized lists, using multiple levels of parentheses to indicate
   nesting.

   The empty list is represented as () -- a parenthesized list with no
   members.


### 4.5.    NIL

   The special atom "NIL" represents the non-existence of a particular
   data item that is represented as a string or parenthesized list, as
   distinct from the empty string "" or the empty parenthesized list ().
