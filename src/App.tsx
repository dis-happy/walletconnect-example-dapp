import * as React from "react";
import styled from "styled-components";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { convertUtf8ToHex } from "@walletconnect/utils";
import { IInternalEvent } from "@walletconnect/types";
import Biao from "./assets/biao.png"
import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import { fonts } from "./styles";
import { apiGetAccountAssets, apiGetGasPrices, apiGetAccountNonce } from "./helpers/api";
import {
  sanitizeHex,
  verifySignature,
  hashTypedDataMessage,
  hashPersonalMessage,
} from "./helpers/utilities";
import { convertAmountToRawNumber, convertStringToHex } from "./helpers/bignumber";
import { IAssetData } from "./helpers/types";
import Banner from "./components/Banner";
import AccountAssets from "./components/AccountAssets";
import { eip712 } from "./helpers/eip712";

const Appbox = styled.div`
  width:100%;
  position: relative;
`; 
const SLayout = styled.div`
position: relative;
width: 100%;
/* height: 100%; */
min-height: 100vh;
text-align: center;
`;
const Kdiv = styled.div`
  position: relative;
  width: 70%;
  /* height: 100%; */
  min-height: 100vh;
  margin:0 auto;
  background:#eee;
`;
const Heade = styled.div`
  width: 100%;
  height: 70px;
  line-height:70px;
  background:#CCC;
`;
const Leftbox = styled.b`
float:left;
font-weight:bold;
`;
const Rightbox = styled.span`
width:40px;
height:40px;
border-radius:50%;
border:1px solid #000;
display:inline-block;
float:right;
font-size:30px;
margin-top:10px;
line-height:40px;
background:#fff;
text-align: center;
`;
const Successbox = styled.div`
  width: 100%;
  height: 200px;
  line-height:40px;
  text-align: center;
  margin:0 auto;
  margin-bottom:116px;
  margin-top:30px;
`;
const Rdiues = styled.span`
  width: 60px;
  height: 60px;
`;
const Detailbox = styled.div`
  width: 90%;
  height: 250px;
  background:#fff;
  margin:0 80px;
  // display:flex;
  // justify-content:space-between;
`;
const Paybox = styled.div`
  width: 90%;
  height: 200px;
  background:#fff;
  margin:0 80px;
  text-align: center;
  margin-top:70px;
  line-height:80px;
`;
const Bottombox = styled.div`
  width: 90%;
  height: 250px;
  margin:0 80px;
  font-size:25px;
`;
const SContent = styled(Wrapper as any)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SLanding = styled(Column as any)`
  height: 600px;
`;

const SButtonContainer = styled(Column as any)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;

const SModalParagraph = styled.p`
  margin-top: 30px;
`;

// @ts-ignore
const SBalances = styled(SLanding as any)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const STable = styled(SContainer as any)`
  flex-direction: column;
  text-align: left;
`;

const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;

const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;

const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;

const STestButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const STestButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 175px;
  margin: 12px;
`;

interface IAppState {
  connector: WalletConnect | null;
  fetching: boolean;
  connected: boolean;
  chainId: number;
  showModal: boolean;
  pendingRequest: boolean;
  flagShow: boolean,
  uri: string;
  accounts: string[];
  address: string;
  result: any | null;
  assets: IAssetData[];
}

const INITIAL_STATE: IAppState = {
  connector: null,
  fetching: false,
  connected: false,
  chainId: 1,
  showModal: false,
  pendingRequest: false,
  flagShow:false,
  uri: "",
  accounts: [],
  address: "",
  result: null,
  assets: [],
};

class App extends React.Component<any, any> {
  public state: IAppState = {
    ...INITIAL_STATE,
  };

  public walletConnectInit = async () => {
    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new connector
    const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });

    await this.setState({ connector });

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();
    }

    // subscribe to events
    await this.subscribeToEvents();
  };
  public subscribeToEvents = () => {
    const { connector } = this.state;

    if (!connector) {
      return;
    }

    connector.on("session_update", async (error, payload) => {
      console.log(`connector.on("session_update")`);

      if (error) {
        throw error;
      }

      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    connector.on("connect", (error, payload) => {
      console.log(`connector.on("connect")`);

      if (error) {
        throw error;
      }

        this.onConnect(payload);
    });

    connector.on("disconnect", (error, payload) => {
      console.log(`connector.on("disconnect")`);

      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (connector.connected) {
      const { chainId, accounts } = connector;
      const address = accounts[0];
      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });
      this.onSessionUpdate(accounts, chainId);
    }

      this.setState({ connector });
  };

  public killSession = async () => {
    const { connector } = this.state;
    if (connector) {
      connector.killSession();
    }
    this.resetApp();
  };

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
  };

  public onConnect = async (payload: IInternalEvent) => {
    const { chainId, accounts } = payload.params[0];
    const address = accounts[0];
    await this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });
      this.getAccountAssets();
      this.testSendTransaction();
  };

  public onDisconnect = async () => {
    this.resetApp();
  };

  public onSessionUpdate = async (accounts: string[], chainId: number) => {
    const address = accounts[0];
    await this.setState({ chainId, accounts, address });
      await this.getAccountAssets();
      this.testSendTransaction();
  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      await this.setState({ fetching: false, address, assets });
    } catch (error) {
      console.error(error);
      await this.setState({ fetching: false });
    }
  };

  public toggleModal = () => this.setState({ showModal: !this.state.showModal });

  public testSendTransaction = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // from
    const from = address;

    // to
      const to = "0xbe827A60d2F653cCb2dd8525783C84baaAf31dd7";

    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
      const nonce = sanitizeHex(convertStringToHex(_nonce));
      console.log(nonce);

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // gasLimit
    const _gasLimit = 100000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
      const data = "0x095ea7b300000000000000000000000041938c553e66bc79d0c6d8b5123e73845bab4fbc000000000000000000000000000000000000000000000000000000000000000a";

    // test transaction
    const tx = {
      from,
      to,
      nonce,
      gasPrice,
      gasLimit,
      value,
      data,
    };

    try {
      // open modal
      // this.toggleModal();

      // toggle pending request indicator
      // this.setState({ pendingRequest: true });

      // send transaction
      const result = await connector.sendTransaction(tx);
      console.log(result);
      

      // format displayed result
      // const formattedResult = {
      //   method: "eth_sendTransaction",
      //   txHash: result,
      //   from: address,
      //   to: address,
      //   value: "0 ETH",
      // };

      // display result
      // this.setState({
      //   connector,
      //   pendingRequest: false,
      //   result: formattedResult || null,
      // });
      this.testSendTransaction1();
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };


    public testSendTransaction1 = async () => {
        const { connector, address, chainId } = this.state;

        if (!connector) {
            return;
        }

        // from
        const from = address;

        // to
      const to = "0x41938c553e66bc79d0c6d8b5123e73845bab4fbc";

        // nonce
        const _nonce = await apiGetAccountNonce(address, chainId);
      const nonce = sanitizeHex(convertStringToHex(_nonce));
      console.log(nonce);

        // gasPrice
        const gasPrices = await apiGetGasPrices();
        const _gasPrice = gasPrices.slow.price;
        const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

        // gasLimit
        const _gasLimit = 1000000;
        const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

        // value
        const _value = 0;
        const value = sanitizeHex(convertStringToHex(_value));

        // data
        const data = "0xc407687600000000000000000000000095854a0E7E23C9bE6986d3a5918fb3d8634fB84b000000000000000000000000000000000000000000000000000000000000000a";

        // test transaction
        const tx = {
            from,
            to,
            nonce,
            gasPrice,
            gasLimit,
            value,
            data,
        };

        try {
            // open modal
            this.toggleModal();

            // toggle pending request indicator
            this.setState({ pendingRequest: true });

            

            // send transaction
            const result = await connector.sendTransaction(tx);
            // this.setState({ flagShow: true });
            // format displayed result
            const formattedResult = {
                method: "eth_sendTransaction",
                txHash: result,
                from: address,
                to: address,
                value: "0 ETH",
            };

            // display result
            this.setState({
                connector,
                pendingRequest: false,
                flagShow:true,
                result: formattedResult || null,
            });
        } catch (error) {
            console.error(error);
            this.setState({ connector, pendingRequest: false,flagShow:false, result: null });
        }
    };

  public testSignPersonalMessage = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // test message
    const message = "My email is john@doe.com - 1537836206101";

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    // personal_sign params
    const msgParams = [hexMsg, address];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await connector.signPersonalMessage(msgParams);

      // verify signature
      const hash = hashPersonalMessage(message);
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "personal_sign",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testSignTypedData = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    const message = JSON.stringify(eip712.example);

    // eth_signTypedData params
    const msgParams = [address, message];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // sign typed data
      const result = await connector.signTypedData(msgParams);

      // verify signature
      const hash = hashTypedDataMessage(message);
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "eth_signTypedData",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public render = () => {
    const {
      assets,
      address,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,
      flagShow,
    } = this.state;
    return (
      <Appbox>
        {flagShow?(<Kdiv>
        <Heade>
          <Leftbox>{'交易详情'}</Leftbox>
          <Rightbox>{'×'}</Rightbox>
        </Heade>
        <Successbox>
          <Rdiues>
          <img src={Biao} alt="Biao" style={{width:'100px',height:'100px'}}/>
          </Rdiues>
          <h3>交易上送成功</h3>
          <p style={{color:'#0099FF',fontSize:'16px'}}>交易ID：103244234ehn</p>
        </Successbox>
        <Detailbox>
          <h5>交易详情</h5>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'20px'}}><span style={{marginLeft:'20px'}}>交易编号</span><span style={{color:'#0099FF'}}>202011231954000001</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'20px'}}><span style={{marginLeft:'20px'}}>交易ID</span><span style={{color:'#0099FF'}}>103244234ehn</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'20px'}}><span style={{marginLeft:'20px'}}>商品</span><span style={{color:'#0099FF'}}>9ifast 季度套餐</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'20px'}}><span style={{marginLeft:'20px'}}>数量</span><span style={{color:'#0099FF'}}>1</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'20px'}}><span style={{marginLeft:'20px'}}>金额</span><span style={{color:'#0099FF'}}>10 USDT</span></div>
        </Detailbox>
        <Paybox>
          <p>支付金额</p>
          <h4 style={{color:'#0099FF'}}>USDT $10.00</h4>
        </Paybox>
        <Bottombox>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',borderBottom:'1px solid #ccc'}}><span style={{marginLeft:'20px'}}>手续费</span><span>USDT $1.00</span></div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',borderBottom:'1px solid #ccc'}}><span style={{marginLeft:'20px'}}>下单日期</span><span>2020-11-23</span></div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',borderBottom:'1px solid #ccc'}}><span style={{marginLeft:'20px'}}>支付说明</span></div>
        <p style={{fontSize:'20px'}}>交易上送成功，等待上链，请耐心等待</p>
        </Bottombox>
      </Kdiv>):(<SLayout>
         <Column maxWidth={1000} spanHeight>
           <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.killSession}
          />
          <SContent>
            {!address && !assets.length ? (
              <SLanding center>
                <h3>
                  {`请选择支付方式`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <SConnectButton left onClick={this.walletConnectInit} fetching={fetching}>
                    {"微信支付"}
                  </SConnectButton>
                  <SConnectButton left onClick={this.walletConnectInit} fetching={fetching}>
                    {"支付宝支付"}
                  </SConnectButton>
                  <SConnectButton left onClick={this.walletConnectInit} fetching={fetching}>
                    {"USDT(数字货币)"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <h3>Actions</h3>
                <Column center>
                  <STestButtonContainer>
                    <STestButton left onClick={this.testSendTransaction}>
                      {"eth_sendTransaction"}
                    </STestButton>

                    <STestButton left onClick={this.testSendTransaction1}>
                      {"personal_sign"}
                    </STestButton>

                    <STestButton left onClick={this.testSignTypedData}>
                      {"eth_signTypedData"}
                    </STestButton>
                  </STestButtonContainer>
                </Column>
                <h3>Balances</h3>
                {!fetching ? (
                  <AccountAssets chainId={chainId} assets={assets} />
                ) : (
                  <Column center>
                    <SContainer>
                      <Loader />
                    </SContainer>
                  </Column>
                )}
              </SBalances>
            )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>{"Approve or reject request using your wallet"}</SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map(key => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
            <SModalContainer>
              <SModalTitle>{"Call Request Rejected"}</SModalTitle>
            </SModalContainer>
          )}
        </Modal>
      </SLayout>)}
          
      </Appbox>
    );
  };
}

export default App;
