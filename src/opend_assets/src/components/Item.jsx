import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import {opend} from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./priceLabel";

function Item(props) {

  const [name, setName] = useState();
  const [ownerName, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setLoaderHidden] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setSellStatus] = useState("");
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);

  const id = props.id;
  const localhost = "http://localhost:8080/";
  const agent = new HttpAgent({host: localhost});
  //TODO: When deploy live, remove the following line
  agent.fetchRootKey();
  let NFTActor;

  async function loadNFT(){
    NFTActor = await Actor.createActor(idlFactory,  {
      agent, 
      canisterId: id,
     });

   const name = await NFTActor.getName();
   const owner = await NFTActor.getOwner();
   const imageData = await NFTActor.getAsset();
   const imageContent = new Uint8Array(imageData);
   const image = URL.createObjectURL(
    new Blob([imageContent.buffer], {type: "image/png"})
   );

   
   setName(name);
   setOwner(owner.toText());
   setImage(image);
   
    if(props.role == "collection") {
    const nftListed = await opend.isListed(props.id);
    if(nftListed){
    setOwner("Owner: OpenD");
    setBlur({filter: "blur(4px)"});
    setSellStatus("Listed");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"}/>);
      }
   } else if(props.role == "discover") {
    const originalOwner = await opend.getOriginalOwner(props.id);
    if(originalOwner.toText() != CURRENT_USER_ID.toText()){
      setButton(<Button handleClick={handleBuy} text={"Buy"}/>);
    }
    const price = await opend.getListedNFTPrice(props.id);
    setPriceLabel(<PriceLabel sellPrice = {price.toString() + " DANG"} />);
   }
  }

  useEffect(() => {
    loadNFT();
  }, []);

  let price;
  function handleSell(){
    console.log("Sell Clicked");
    setPriceInput(<input 
      placeholder="Price in DANG"
      type="number"
      className="price-input"
      value={price}
      onChange={(e) => price=e.target.value}
      />);
      setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }

  async function sellItem(){
    setBlur({filter: "blur(4px)"});
    setLoaderHidden(false);
    console.log("Set Price: "+price);
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log("listing: "+listingResult);
    if(listingResult == "Success"){
      const openDId = await opend.getOpenDCanisterID();
      const tranferResult = await NFTActor.transferOwnership(openDId);  
      console.log("transfer Result: "+tranferResult);
      if(tranferResult == "Success") {
        setLoaderHidden(true);
        setButton();
        setPriceInput();
        setOwner("Owner: OpenD");
        setSellStatus("Listed");
      }
    }
  }

  async function handleBuy() {
    console.log("Buy was triggered");
    setLoaderHidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent, 
      canisterId: Principal.fromText("qaa6y-5yaaa-aaaaa-aaafa-cai"),
    });

    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    console.log(result);
    if(result == "Success"){
      //Transfer ownership
      const transferResult = await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log("purchased: "+transferResult);
      setLoaderHidden(true);
      setDisplay(false);
    }
  }

  return (
    <div style={{display: shouldDisplay ? "inline": "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div hidden={loaderHidden} className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            {ownerName}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
